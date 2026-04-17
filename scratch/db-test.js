const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.jzupwygwzatugbrmqjau:NkCvIb9EHcGApN93@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
  });
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected!');
    
    // Check person schema
    const agencySchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agency';
    `);
    console.log('Agency schema:', agencySchema.rows);

    // Check hospital schema
    const hospitalSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'hospital';
    `);
    console.log('Hospital schema:', hospitalSchema.rows);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
