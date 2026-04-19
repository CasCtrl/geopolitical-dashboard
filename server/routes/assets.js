import express from 'express';
import sql from 'mssql';
import { getPool } from '../db/config.js';

const router = express.Router();

// Get all datasets
router.get('/datasets', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query('SELECT * FROM Datasets');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching datasets:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get assets for a specific dataset
router.get('/assets/:datasetId', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('datasetId', sql.NVarChar(50), req.params.datasetId);

    const result = await request.query(`
      SELECT a.id, a.datasetId, a.ticker, a.assetName, a.weight, a.value, a.sector
      FROM Assets a
      WHERE a.datasetId = @datasetId
      ORDER BY a.weight DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching assets:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get country dependencies for a specific dataset
router.get('/dependencies/:datasetId', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('datasetId', sql.NVarChar(50), req.params.datasetId);

    const result = await request.query(`
      SELECT cd.id, cd.ticker, cd.country, cd.dependencyWeight, cd.dependencyType, cd.dependencyReason
      FROM CountryDependencies cd
      WHERE cd.datasetId = @datasetId
      ORDER BY cd.country, cd.ticker
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching dependencies:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get countries with base risk scores
router.get('/countries', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query('SELECT name, baseRiskScore FROM Countries ORDER BY name');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching countries:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get complete portfolio data for a dataset
router.get('/portfolio/:datasetId', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('datasetId', sql.NVarChar(50), req.params.datasetId);

    // Get assets
    const assetsResult = await request.query(`
      SELECT id, datasetId, ticker, assetName, weight, value, sector
      FROM Assets
      WHERE datasetId = @datasetId
      ORDER BY weight DESC
    `);

    // Get dependencies for each asset
    const dependenciesResult = await request.query(`
      SELECT ticker, country, dependencyWeight, dependencyType, dependencyReason
      FROM CountryDependencies
      WHERE datasetId = @datasetId
      ORDER BY ticker, country
    `);

    // Get countries
    const countriesResult = await pool.query('SELECT name, baseRiskScore FROM Countries');

    res.json({
      dataset: {
        id: req.params.datasetId,
        assets: assetsResult.recordset,
        dependencies: dependenciesResult.recordset,
        countries: countriesResult.recordset,
      },
    });
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
