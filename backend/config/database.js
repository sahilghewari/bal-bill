const { Pool } = require('pg');
const config = require('./environments');
const logger = require('../middleware/logger');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: config.database.max,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err.message });
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
