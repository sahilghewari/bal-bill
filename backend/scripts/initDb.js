const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function initDatabase() {
  try {
    console.log('📦 Initializing database...');

    const sqlPath = path.join(__dirname, '../migrations/init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);

    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();
