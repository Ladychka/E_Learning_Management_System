const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://elms:elms_secret@localhost:5432/elms_db?schema=public',
});

client.connect()
  .then(() => client.query('SELECT NOW()'))
  .then(res => {
    console.log('✅ Connected! Server time:', res.rows[0].now);
    client.end();
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    client.end();
    process.exit(1);
  });