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
  res.json(filterFields(countries, req.query.fields));
});

// Get country by name (partial match)
app.get('/countries/name/:name', (req, res) => {
  const { name } = req.params;

  if (!name) {
    res.status(404).json({ error: "Parameter 'name' is required" });
  }

  const result = countries.filter(country =>
    country.name.common.toLowerCase().includes(name.toLowerCase()) ||
    country.name.official.toLowerCase().includes(name.toLowerCase())
  );
  res.json(filterFields(result, req.query.fields));
});

// Get country by full name (exact match)
app.get('/countries/fullname/:name', (req, res) => {
  const { name } = req.params;

  if (!name) {
    res.status(404).json({ error: "Parameter 'name' is required" });
  }

  const result = countries.filter(country =>
    country.name.common.toLowerCase() === name.toLowerCase() ||
    country.name.official.toLowerCase() === name.toLowerCase()
  );
  res.json(filterFields(result, req.query.fields));
});

// Get country by code (cca2, cca3, ccn3, cioc)
app.get('/countries/code/:code', (req, res) => {
  const { code } = req.params;

  if (!code) {
    res.status(404).json({ error: "Parameter 'code' is required" });
  }

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

  const result = countries.filter(country =>
    codes.includes(country.cca2) ||
    codes.includes(country.cca3) ||
    codes.includes(country.ccn3) ||
    (country.cioc && codes.includes(country.cioc))
  );
  res.json(filterFields(result, req.query.fields));
});

// Get country by code (alternative route for /alpha/{code})
app.get('/countries/alpha/:code', (req, res) => {
  const { code } = req.params;

  if (!code) {
    return res.status(400).json({ error: "Parameter 'code' is required" });
  }

  const result = countries.find(country =>
    country.cca2.toLowerCase() === code.toLowerCase() ||
    country.cca3.toLowerCase() === code.toLowerCase() ||
    country.ccn3 === code ||
    (country.cioc && country.cioc.toLowerCase() === code.toLowerCase())
  );
  res.json(filterFields(result || {}, req.query.fields));
});

// Get country by currency
app.get('/countries/currency/:currency', (req, res) => {
  const { currency } = req.params;

  if (!currency) {
    return res.status(400).json({ error: "Parameter 'currency' is required" });
  }

  const result = countries.filter(country => country.currencies && country.currencies[currency]);
  res.json(filterFields(result, req.query.fields));
});

// Get country by demonym
app.get('/countries/demonym/:demonym', (req, res) => {
  const { demonym } = req.params;

  if (!demonym) {
    return res.status(400).json({ error: "Parameter 'demonym' is required" });
  }

  const result = countries.filter(country =>
    country.demonyms?.eng?.m.toLowerCase() === demonym.toLowerCase() ||
    country.demonyms?.eng?.f.toLowerCase() === demonym.toLowerCase()
  );
  res.json(filterFields(result, req.query.fields));
});

// Get country by language
app.get('/countries/lang/:language', (req, res) => {
  const { language } = req.params;

  if (!language) {
    return res.status(400).json({ error: "Parameter 'language' is required" });
  }

  const result = countries.filter(country => Object.values(country.languages || {}).includes(language));
  res.json(filterFields(result, req.query.fields));
});

// Get country by capital
app.get('/countries/capital/:capital', (req, res) => {
  const { capital } = req.params;

  if (!capital) {
    return res.status(400).json({ error: "Parameter 'capital' is required" });
  }

  const result = countries.filter(country => country.capital && country.capital.includes(capital));
  res.json(filterFields(result, req.query.fields));
});

// Get country by region
app.get('/countries/region/:region', (req, res) => {
  const { region } = req.params;

  if (!region) {
    return res.status(400).json({ error: "Parameter 'region' is required" });
  }

  const result = countries.filter(country => country.region.toLowerCase() === region.toLowerCase());
  res.json(filterFields(result, req.query.fields));
});

// Get country by subregion
app.get('/countries/subregion/:subregion', (req, res) => {
  const { subregion } = req.params;

  if (!subregion) {
    return res.status(400).json({ error: "Parameter 'subregion' is required" });
  }

  const result = countries.filter(country => country.subregion.toLowerCase() === subregion.toLowerCase());
  res.json(filterFields(result, req.query.fields));
});

// Get country by translation name
app.get('/countries/translation/:translation', (req, res) => {
  const { translation } = req.params;

  if (!translation) {
    return res.status(400).json({ error: "Parameter 'translation' is required" });
  }

  const result = countries.filter(country =>
    Object.values(country.translations || {}).some(t => t.common.toLowerCase() === translation.toLowerCase())
  );
  res.json(filterFields(result, req.query.fields));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
