const express = require('express');
const http = require('http');
const swaggerUi = require('swagger-ui-express');
const UnitsInfo = require("./units.json");
const YAML = require('yamljs'); // Підключення бібліотеки для роботи з YAML


const app = express();
const server = http.createServer(app);

const keysListForConvert = new Set(["distance", "unit", "value", "convertTo"]);

// Загальні функції, які використовуються у роутах
function throwJSONError(str) { throw new Error(str) }

function requestJSONValidator(objForTest, keysList) {
  let result = true;
  for (const key in objForTest) {
    if (!keysList.has(key)) {
      result = false;
    }
    if (typeof objForTest[key] === 'object') {
      result = result && requestJSONValidator(objForTest[key], keysList);
    }
  }
  return result;
}

function checkInputTypeAndThrowEx(data, type, message) {
  if (typeof (data) !== type) { throwJSONError(message) }
}

function checkerConvertingData(data) {
  if (requestJSONValidator(data, keysListForConvert) === false) { throwJSONError('Invalid request structure') }
  checkInputTypeAndThrowEx(data.distance, "object", 'Invalid structure')
  checkInputTypeAndThrowEx(data.distance.unit, "string", 'Invalid data')
  checkInputTypeAndThrowEx(data.distance.value, "number", 'Invalid data')
  checkInputTypeAndThrowEx(data.convertTo, "string", 'Invalid data')
}

function convertDistance(data) {
  const units = UnitsInfo;
  checkerConvertingData(data)

  const fromUnit = data.distance.unit.toLowerCase();
  const toUnit = data.convertTo.toLowerCase();

  if (!(fromUnit in units) || !(toUnit in units)) {
    throw new Error('Invalid units');
  }

  const fromValue = data.distance.value;
  const toValue = fromValue * (units[fromUnit] / units[toUnit]);

  return {
    unit: toUnit,
    value: parseFloat(toValue.toFixed(2)),
  };
}

// Роути Express
app.post('/convert', (req, res) => {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    try {
      console.log("request_data0");
      const requestData = JSON.parse(body);
      console.log("request_data");
      const result = convertDistance(requestData);
      res.status(200).json({ result });
    } catch (error) {
      res.status(400).send('Invalid JSON data');
    }
  });

  req.on('error', (error) => {
    console.error(`Error sending request: ${error.message}`);
  });
});

app.delete('/convert_delete', (req, res) => {
  const unitToDelete = req.query.unit;

  if (!unitToDelete) {
    res.status(400).send('Unit parameter is required');
  } else {
    deleteUnit(unitToDelete, res);
  }
});

app.get('/units', (req, res) => {
  const units = UnitsInfo;
  res.status(200).json({ units });
});

function deleteUnit(unitToDelete, res) {
  const units = UnitsInfo;
  const normalizedUnitToDelete = unitToDelete.toLowerCase();

  if (!(normalizedUnitToDelete in units)) {
    res.status(404).send('Unit not found');
  } else {
    delete units[normalizedUnitToDelete];
    res.status(200).send('Unit deleted successfully');
  }
}

const swaggerDocument = YAML.load('./swagger.yaml'); // Завантаження вашого YAML файлу

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
