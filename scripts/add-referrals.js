const fs = require('fs');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const client = await pool.connect();
    
    // Add columns to agent
    await client.query(`ALTER TABLE public.agent ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;`);
    await client.query(`ALTER TABLE public.agent ADD COLUMN IF NOT EXISTS wallet_balance integer DEFAULT 0;`);
    
    // Create referral history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.referral_history (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          referrer_id uuid NOT NULL,
          referred_user_id uuid NOT NULL,
          reward_amount integer NOT NULL,
          created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    client.release();
    console.log('Successfully applied referral DB changes.');
  } catch (error) {
    console.error('Error in DB migration:', error);
  } finally {
    pool.end();
  }
}

main();
