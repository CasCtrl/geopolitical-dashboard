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
    console.log('Initializing database schema...');

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
    console.error('Database initialization error:', err);
    throw err;
  }
}

async function loadDataFromCSV(conn) {
  return new Promise((resolve, reject) => {
    const datasetMap = new Map();
    const countrySet = new Set();
    const sectorSet = new Set();
    const assetsData = [];
    const dependenciesData = [];

    const csvPath = path.join(__dirname, '../../public/datasets.csv');

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
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
          weight: parseFloat(row.weight),
          value: parseFloat(row.value),
          sector: row.sector,
        });

        // Collect dependency data
        dependenciesData.push({
          datasetId: row.datasetId,
          ticker: row.ticker,
          country: row.country,
          dependencyWeight: parseFloat(row.dependencyWeight),
          dependencyType: row.dependencyType,
          dependencyReason: row.dependencyReason,
        });
      })
      .on('end', async () => {
        try {
          // Insert countries
          console.log(`Inserting ${countrySet.size} countries...`);
          for (const country of countrySet) {
            try {
              await conn.query(
                `INSERT INTO Countries (name, baseRiskScore) VALUES (@name, @score)`,
                {
                  name: { value: country, type: sql.NVarChar(100) },
                  score: { value: 50, type: sql.Float },
                }
              );
            } catch (err) {
              // Country might already exist, skip
            }
          }

          // Insert sectors
          console.log(`Inserting ${sectorSet.size} sectors...`);
          for (const sector of sectorSet) {
            try {
              await conn.query(
                `INSERT INTO Sectors (name) VALUES (@name)`,
                { name: { value: sector, type: sql.NVarChar(100) } }
              );
            } catch (err) {
              // Sector might already exist, skip
            }
          }

          // Insert datasets
          console.log(`Inserting ${datasetMap.size} datasets...`);
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

          // Insert assets (deduplicated)
          console.log(`Inserting assets...`);
          const uniqueAssets = new Map();
          for (const asset of assetsData) {
            const key = `${asset.datasetId}|${asset.ticker}`;
            if (!uniqueAssets.has(key)) {
              uniqueAssets.set(key, asset);
            }
          }

          for (const asset of uniqueAssets.values()) {
            try {
              await conn.query(
                `INSERT INTO Assets (datasetId, ticker, assetName, weight, value, sector) 
                 VALUES (@datasetId, @ticker, @assetName, @weight, @value, @sector)`,
                {
                  datasetId: { value: asset.datasetId, type: sql.NVarChar(50) },
                  ticker: { value: asset.ticker, type: sql.NVarChar(50) },
                  assetName: { value: asset.assetName, type: sql.NVarChar(255) },
                  weight: { value: asset.weight, type: sql.Float },
                  value: { value: asset.value, type: sql.Float },
                  sector: { value: asset.sector, type: sql.NVarChar(100) },
                }
              );
            } catch (err) {
              // Asset might already exist, skip
            }
          }

          // Insert dependencies
          console.log(`Inserting ${dependenciesData.length} country dependencies...`);
          for (const dep of dependenciesData) {
            try {
              await conn.query(
                `INSERT INTO CountryDependencies (datasetId, ticker, country, dependencyWeight, dependencyType, dependencyReason)
                 VALUES (@datasetId, @ticker, @country, @weight, @type, @reason)`,
                {
                  datasetId: { value: dep.datasetId, type: sql.NVarChar(50) },
                  ticker: { value: dep.ticker, type: sql.NVarChar(50) },
                  country: { value: dep.country, type: sql.NVarChar(100) },
                  weight: { value: dep.dependencyWeight, type: sql.Float },
                  type: { value: dep.dependencyType, type: sql.NVarChar(50) },
                  reason: { value: dep.dependencyReason, type: sql.NVarChar(500) },
                }
              );
            } catch (err) {
              // Dependency might already exist, skip
            }
          }

          console.log('✓ CSV data loaded successfully');
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

export { initializeDatabase };
