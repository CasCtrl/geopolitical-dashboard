import express from 'express';
import sql from 'mssql';
import { getPool } from '../db/config.js';
import { ApiError } from '../middleware/apiError.js';
import { z, validateParams } from '../middleware/validate.js';

const router = express.Router();
const datasetParamsSchema = z.object({ datasetId: z.string().min(1).max(50) });

// Get all datasets
router.get('/datasets', async (req, res, next) => {
  try {
    const pool = await getPool();
    if (!pool) {
      console.warn('Database not available, returning empty datasets');
      return res.json([]);
    }
    const result = await pool.query('SELECT * FROM Datasets');
    res.json(result.recordset);
  } catch {
    next(new ApiError(500, 'DATASETS_FETCH_FAILED', 'Failed to fetch datasets'));
  }
});

// Get assets for a specific dataset
router.get('/assets/:datasetId', validateParams(datasetParamsSchema), async (req, res, next) => {
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
  } catch {
    next(new ApiError(500, 'ASSETS_FETCH_FAILED', 'Failed to fetch assets'));
  }
});

// Get country dependencies for a specific dataset
router.get('/dependencies/:datasetId', validateParams(datasetParamsSchema), async (req, res, next) => {
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
  } catch {
    next(new ApiError(500, 'DEPENDENCIES_FETCH_FAILED', 'Failed to fetch dependencies'));
  }
});

// Get countries with base risk scores
router.get('/countries', async (req, res, next) => {
  try {
    const pool = await getPool();
    if (!pool) {
      console.warn('Database not available, returning empty countries');
      return res.json([]);
    }
    const result = await pool.query('SELECT name, baseRiskScore FROM Countries ORDER BY name');
    res.json(result.recordset);
  } catch {
    next(new ApiError(500, 'COUNTRIES_FETCH_FAILED', 'Failed to fetch countries'));
  }
});

// Get complete portfolio data for a dataset - OPTIMIZED with JOINs
router.get('/portfolio/:datasetId', validateParams(datasetParamsSchema), async (req, res, next) => {
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
  } catch {
    next(new ApiError(500, 'PORTFOLIO_FETCH_FAILED', 'Failed to fetch portfolio data'));
  }
});

// Optimized endpoint to get assets and dependencies together (for client-side parallel requests)
router.get('/assets-with-deps/:datasetId', validateParams(datasetParamsSchema), async (req, res, next) => {
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
  } catch {
    next(new ApiError(500, 'ASSETS_WITH_DEPENDENCIES_FETCH_FAILED', 'Failed to fetch assets with dependencies'));
  }
});

export default router;
