import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { getPool, config } from './config.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeDatabase() {
  let conn;
  try {
    conn = new sql.ConnectionPool(config);
    await conn.connect();
    console.log('\u2713 Initializing database schema...');

    // Create tables
    await conn.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Countries]') AND type in (N'U'))
      CREATE TABLE Countries (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(100) NOT NULL UNIQUE,
        baseRiskScore FLOAT DEFAULT 0
      )
    `);

    await conn.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Sectors]') AND type in (N'U'))
      CREATE TABLE Sectors (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(100) NOT NULL UNIQUE
      )
    `);

    await conn.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Datasets]') AND type in (N'U'))
      CREATE TABLE Datasets (
        id INT PRIMARY KEY IDENTITY(1,1),
        datasetId NVARCHAR(50) NOT NULL UNIQUE,
        datasetName NVARCHAR(255) NOT NULL,
        datasetDescription NVARCHAR(500)
      )
    `);

    await conn.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Assets]') AND type in (N'U'))
      CREATE TABLE Assets (
        id INT PRIMARY KEY IDENTITY(1,1),
        datasetId NVARCHAR(50) NOT NULL,
        ticker NVARCHAR(50) NOT NULL,
        assetName NVARCHAR(255) NOT NULL,
        weight FLOAT NOT NULL,
        value FLOAT NOT NULL,
        sector NVARCHAR(100),
        FOREIGN KEY (datasetId) REFERENCES Datasets(datasetId),
        UNIQUE(datasetId, ticker)
      )
    `);

    await conn.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CountryDependencies]') AND type in (N'U'))
      CREATE TABLE CountryDependencies (
        id INT PRIMARY KEY IDENTITY(1,1),
        datasetId NVARCHAR(50) NOT NULL,
        ticker NVARCHAR(50) NOT NULL,
        country NVARCHAR(100) NOT NULL,
        dependencyWeight FLOAT NOT NULL,
        dependencyType NVARCHAR(50) NOT NULL,
        dependencyReason NVARCHAR(500),
        FOREIGN KEY (datasetId, ticker) REFERENCES Assets(datasetId, ticker),
        FOREIGN KEY (country) REFERENCES Countries(name)
      )
    `);

    console.log('✓ Database schema created');

    // Load data from CSV
    await loadDataFromCSV(conn);

    await conn.close();
    console.log('✓ Database initialization complete');
  } catch (err) {
    console.warn('\u26a0 Database initialization failed:', err.message);
    if (conn) {
      try {
        await conn.close();
      } catch (closeErr) {
        // Ignore close errors
      }
    }
  }
}

async function loadDataFromCSV(conn) {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if data already exists to avoid reloading on every startup
      const result = await conn.query('SELECT COUNT(*) as count FROM Datasets');
      if (result.recordset[0].count > 0) {
        console.log('✓ Database already populated, skipping CSV load');
        return resolve();
      }

      const datasetMap = new Map();
      const countrySet = new Set();
      const sectorSet = new Set();
      const assetsData = [];
      const dependenciesData = [];

      const csvPath = path.join(__dirname, '../../public/datasets.csv');

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('CSV parsing timeout after 30 seconds'));
      }, 30000);

      // Check if file exists first
      if (!fs.existsSync(csvPath)) {
        clearTimeout(timeout);
        console.warn('⚠ CSV file not found at', csvPath, '- skipping data load');
        return resolve();
      }

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          // Validate required fields
          if (!row.datasetId || !row.ticker || !row.country) {
            console.warn('⚠ Skipping invalid row:', row);
            return;
          }

          // Collect datasets
          if (!datasetMap.has(row.datasetId)) {
            datasetMap.set(row.datasetId, {
              datasetId: row.datasetId,
              datasetName: row.datasetName,
              datasetDescription: row.datasetDescription,
            });
          }

          // Collect countries
          countrySet.add(row.country);

          // Collect sectors
          if (row.sector) {
            sectorSet.add(row.sector);
          }

          // Collect asset data
          assetsData.push({
            datasetId: row.datasetId,
            ticker: row.ticker,
            assetName: row.assetName,
            weight: parseFloat(row.weight) || 0,
            value: parseFloat(row.value) || 0,
            sector: row.sector,
          });

          // Collect dependency data
          dependenciesData.push({
            datasetId: row.datasetId,
            ticker: row.ticker,
            country: row.country,
            dependencyWeight: parseFloat(row.dependencyWeight) || 0,
            dependencyType: row.dependencyType,
            dependencyReason: row.dependencyReason,
          });
        })
        .on('end', async () => {
          clearTimeout(timeout);
          try {
            console.log(`Loading ${countrySet.size} countries, ${sectorSet.size} sectors...`);

            // Batch insert countries
            const countryArray = Array.from(countrySet);
            for (let i = 0; i < countryArray.length; i += 50) {
              const batch = countryArray.slice(i, i + 50);
              const valueClauses = batch.map((_, idx) => `(@country${idx}, 50)`).join(',');
              const params = {};
              batch.forEach((country, idx) => {
                params[`country${idx}`] = { value: country, type: sql.NVarChar(100) };
              });

              try {
                await conn.query(
                  `INSERT INTO Countries (name, baseRiskScore) VALUES ${valueClauses}`,
                  params
                );
              } catch (err) {
                // Countries might already exist, continue
              }
            }

            // Batch insert sectors
            const sectorArray = Array.from(sectorSet);
            for (let i = 0; i < sectorArray.length; i += 50) {
              const batch = sectorArray.slice(i, i + 50);
              const valueClauses = batch.map((_, idx) => `(@sector${idx})`).join(',');
              const params = {};
              batch.forEach((sector, idx) => {
                params[`sector${idx}`] = { value: sector, type: sql.NVarChar(100) };
              });

              try {
                await conn.query(
                  `INSERT INTO Sectors (name) VALUES ${valueClauses}`,
                  params
                );
              } catch (err) {
                // Sectors might already exist, continue
              }
            }

            // Batch insert datasets
            for (const [, dataset] of datasetMap) {
              try {
                await conn.query(
                  `INSERT INTO Datasets (datasetId, datasetName, datasetDescription) VALUES (@id, @name, @desc)`,
                  {
                    id: { value: dataset.datasetId, type: sql.NVarChar(50) },
                    name: { value: dataset.datasetName, type: sql.NVarChar(255) },
                    desc: { value: dataset.datasetDescription, type: sql.NVarChar(500) },
                  }
                );
              } catch (err) {
                // Dataset might already exist, skip
              }
            }

            // Deduplicate and batch insert assets
            const uniqueAssets = new Map();
            for (const asset of assetsData) {
              const key = `${asset.datasetId}|${asset.ticker}`;
              if (!uniqueAssets.has(key)) {
                uniqueAssets.set(key, asset);
              }
            }

            console.log(`Inserting ${uniqueAssets.size} assets and ${dependenciesData.length} dependencies...`);

            // Batch assets by 25 at a time to avoid query size limits
            const assetsArray = Array.from(uniqueAssets.values());
            for (let i = 0; i < assetsArray.length; i += 25) {
              const batch = assetsArray.slice(i, i + 25);
              const valueClauses = batch.map((_, idx) => 
                `(@did${idx}, @ticker${idx}, @aname${idx}, @weight${idx}, @value${idx}, @sector${idx})`
              ).join(',');
              const params = {};

              batch.forEach((asset, idx) => {
                params[`did${idx}`] = { value: asset.datasetId, type: sql.NVarChar(50) };
                params[`ticker${idx}`] = { value: asset.ticker, type: sql.NVarChar(50) };
                params[`aname${idx}`] = { value: asset.assetName, type: sql.NVarChar(255) };
                params[`weight${idx}`] = { value: asset.weight, type: sql.Float };
                params[`value${idx}`] = { value: asset.value, type: sql.Float };
                params[`sector${idx}`] = { value: asset.sector, type: sql.NVarChar(100) };
              });

              try {
                await conn.query(
                  `INSERT INTO Assets (datasetId, ticker, assetName, weight, value, sector) 
                   VALUES ${valueClauses}`,
                  params
                );
              } catch (err) {
                console.warn('⚠ Some assets already exist, continuing...');
              }
            }

            // Batch insert dependencies
            for (let i = 0; i < dependenciesData.length; i += 25) {
              const batch = dependenciesData.slice(i, i + 25);
              const valueClauses = batch.map((_, idx) =>
                `(@did${idx}, @ticker${idx}, @country${idx}, @weight${idx}, @type${idx}, @reason${idx})`
              ).join(',');
              const params = {};

              batch.forEach((dep, idx) => {
                params[`did${idx}`] = { value: dep.datasetId, type: sql.NVarChar(50) };
                params[`ticker${idx}`] = { value: dep.ticker, type: sql.NVarChar(50) };
                params[`country${idx}`] = { value: dep.country, type: sql.NVarChar(100) };
                params[`weight${idx}`] = { value: dep.dependencyWeight, type: sql.Float };
                params[`type${idx}`] = { value: dep.dependencyType, type: sql.NVarChar(50) };
                params[`reason${idx}`] = { value: dep.dependencyReason, type: sql.NVarChar(500) };
              });

              try {
                await conn.query(
                  `INSERT INTO CountryDependencies (datasetId, ticker, country, dependencyWeight, dependencyType, dependencyReason)
                   VALUES ${valueClauses}`,
                  params
                );
              } catch (err) {
                console.warn('⚠ Some dependencies already exist, continuing...');
              }
            }

            console.log('✓ CSV data loaded successfully');
            resolve();
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          console.error('CSV stream error:', err);
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
}

export { initializeDatabase };
