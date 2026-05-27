const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'credisa_inventory',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

pool.query(`UPDATE usuarios SET usuario = SPLIT_PART(email, '@', 1) WHERE usuario IS NULL`)
  .then((result) => {
    console.log(`✅ ${result.rowCount} usuario(s) filled from email`);
    return pool.end();
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    pool.end();
  });
