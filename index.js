const express = require('express');
const fs = require('fs');
const path = require('path');
const { get } = require('radash');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

// Load country data from file
const countries = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'countriesV3.1.json'), 'utf8')
);

// Helper function to filter fields, including deep nested fields using radash
const filterFields = (data, fields) => {
  if (!fields) return data;
  const fieldList = fields.split(',');
  return Array.isArray(data)
    ? data.map(country => Object.fromEntries(fieldList.map(field => [field, get(country, field)]).filter(([, value]) => value !== undefined)))
    : Object.fromEntries(fieldList.map(field => [field, get(data, field)]).filter(([, value]) => value !== undefined));
};

// Middleware for logging requests
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Middleware for JSON response
app.use(express.json());

// Serve API documentation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Get all countries
app.get('/countries', (req, res) => {
  console.log(`Request to /countries`);
  res.json(filterFields(countries, req.query.fields));
});

// Get country by name (partial match)
app.get('/countries/name/:name', (req, res) => {
  const { name } = req.params;
  console.log(`Request to /countries/name/${name}`);
  const result = countries.filter(country =>
    country.name.common.toLowerCase().includes(name.toLowerCase()) ||
    country.name.official.toLowerCase().includes(name.toLowerCase())
  );
  res.json(filterFields(result, req.query.fields));
});

// Get country by full name (exact match)
app.get('/countries/fullname/:name', (req, res) => {
  const { name } = req.params;
  console.log(`Request to /countries/fullname/${name}`);
  const result = countries.filter(country =>
    country.name.common.toLowerCase() === name.toLowerCase() ||
    country.name.official.toLowerCase() === name.toLowerCase()
  );
  res.json(filterFields(result, req.query.fields));
});

// Get country by code (cca2, cca3, ccn3, cioc)
app.get('/countries/code/:code', (req, res) => {
  const { code } = req.params;
  console.log(`Request to /countries/code/${code}`);
  const result = countries.find(country =>
    country.cca2.toLowerCase() === code.toLowerCase() ||
    country.cca3.toLowerCase() === code.toLowerCase() ||
    country.ccn3 === code ||
    (country.cioc && country.cioc.toLowerCase() === code.toLowerCase())
  );
  res.json(filterFields(result || {}, req.query.fields));
});

// Get countries by multiple codes
app.get('/countries/codes', (req, res) => {
  if (!req.query.codes) {
    return res.status(400).json({ error: "Query parameter 'codes' is required" });
  }
  const codes = req.query.codes.split(',');
  console.log(`Request to /countries/codes with codes: ${codes}`);
  const result = countries.filter(country =>
    codes.includes(country.cca2) ||
    codes.includes(country.cca3) ||
    codes.includes(country.ccn3) ||
    (country.cioc && codes.includes(country.cioc))
  );
  res.json(filterFields(result, req.query.fields));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
