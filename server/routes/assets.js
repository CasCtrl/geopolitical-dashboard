import express from 'express';
import sql from 'mssql';
import { getPool } from '../db/config.js';

const router = express.Router();

// Get all datasets
router.get('/datasets', async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      console.warn('Database not available, returning empty datasets');
      return res.json([]);
    }
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
    if (!pool) {
      console.warn('Database not available, returning empty assets');
      return res.json([]);
    }
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
    if (!pool) {
      console.warn('Database not available, returning empty dependencies');
      return res.json([]);
    }
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
    if (!pool) {
      console.warn('Database not available, returning empty countries');
      return res.json([]);
    }
    const result = await pool.query('SELECT name, baseRiskScore FROM Countries ORDER BY name');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching countries:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get complete portfolio data for a dataset - OPTIMIZED with JOINs
router.get('/portfolio/:datasetId', async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      console.warn('Database not available, returning empty portfolio');
      return res.json({
        dataset: {
          id: req.params.datasetId,
          assets: [],
          dependencies: [],
          countries: [],
        },
      });
    }
    const request = pool.request();
    request.input('datasetId', sql.NVarChar(50), req.params.datasetId);

    // Get assets and dependencies in a single optimized query
    const portfolioResult = await request.query(`
      SELECT 
        a.id as assetId,
        a.datasetId, 
        a.ticker, 
        a.assetName, 
        a.weight, 
        a.value, 
        a.sector,
        cd.country,
        cd.dependencyWeight,
        cd.dependencyType,
        cd.dependencyReason
      FROM Assets a
      LEFT JOIN CountryDependencies cd ON a.ticker = cd.ticker AND a.datasetId = cd.datasetId
      WHERE a.datasetId = @datasetId
      ORDER BY a.weight DESC, cd.country
    `);

    // Get countries
    const countriesResult = await pool.query('SELECT name, baseRiskScore FROM Countries');

    // Transform the denormalized result back to structured format
    const assetsMap = new Map();
    const assets = [];
    const dependencies = [];

    portfolioResult.recordset.forEach(row => {
      // Collect unique assets
      if (!assetsMap.has(row.ticker)) {
        assetsMap.set(row.ticker, true);
        assets.push({
          id: row.assetId,
          datasetId: row.datasetId,
          ticker: row.ticker,
          assetName: row.assetName,
          weight: row.weight,
          value: row.value,
          sector: row.sector,
        });
      }

      // Collect dependencies
      if (row.country) {
        dependencies.push({
          ticker: row.ticker,
          country: row.country,
          dependencyWeight: row.dependencyWeight,
          dependencyType: row.dependencyType,
          dependencyReason: row.dependencyReason,
        });
      }
    });

    res.json({
      dataset: {
        id: req.params.datasetId,
        assets,
        dependencies,
        countries: countriesResult.recordset,
      },
    });
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ error: err.message });
  }
});

// Optimized endpoint to get assets and dependencies together (for client-side parallel requests)
router.get('/assets-with-deps/:datasetId', async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      console.warn('Database not available, returning empty assets with deps');
      return res.json([]);
    }
    const request = pool.request();
    request.input('datasetId', sql.NVarChar(50), req.params.datasetId);

    const result = await request.query(`
      SELECT 
        a.id, 
        a.datasetId, 
        a.ticker, 
        a.assetName, 
        a.weight, 
        a.value, 
        a.sector,
        cd.country,
        cd.dependencyWeight,
        cd.dependencyType,
        cd.dependencyReason
      FROM Assets a
      LEFT JOIN CountryDependencies cd ON a.ticker = cd.ticker AND a.datasetId = cd.datasetId
      WHERE a.datasetId = @datasetId
      ORDER BY a.weight DESC, COALESCE(cd.country, '')
    `);

    // Transform to asset-centric format
    const assetsMap = new Map();
    result.recordset.forEach(row => {
      if (!assetsMap.has(row.ticker)) {
        assetsMap.set(row.ticker, {
          id: row.id,
          datasetId: row.datasetId,
          ticker: row.ticker,
          assetName: row.assetName,
          weight: row.weight,
          value: row.value,
          sector: row.sector,
          dependencies: [],
        });
      }

      if (row.country) {
        assetsMap.get(row.ticker).dependencies.push({
          country: row.country,
          dependencyWeight: row.dependencyWeight,
          dependencyType: row.dependencyType,
          dependencyReason: row.dependencyReason,
        });
      }
    });

    res.json(Array.from(assetsMap.values()));
  } catch (err) {
    console.error('Error fetching assets with dependencies:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
