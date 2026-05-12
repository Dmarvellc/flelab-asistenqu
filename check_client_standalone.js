const { Pool } = require('pg');

async function check() {
  const connectionString = "postgresql://postgres.wzlmuefsbmbzcjioktkc:FLELAB_030507@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";
  const pool = new Pool({ connectionString });
  const id = "498e95d9-422c-4b33-9987-798c56ea667a";
  
  try {
    console.log("Checking client:", id);
    const res = await pool.query("SELECT * FROM public.client WHERE client_id = $1", [id]);
    console.log("Client row:", JSON.stringify(res.rows[0], null, 2));
    
    if (res.rows[0]) {
      const personId = res.rows[0].person_id;
      const personRes = await pool.query("SELECT * FROM public.person WHERE person_id = $1", [personId]);
      console.log("Person row:", JSON.stringify(personRes.rows[0], null, 2));
      
      const agentId = res.rows[0].agent_id;
      if (agentId) {
        const agentRes = await pool.query("SELECT * FROM public.app_user WHERE user_id = $1", [agentId]);
        console.log("Agent row:", JSON.stringify(agentRes.rows[0], null, 2));
      } else {
        console.log("No agent_id for this client");
      }
    } else {
      console.log("Client NOT FOUND in database");
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
