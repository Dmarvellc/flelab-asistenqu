import { dbPool } from "@/lib/db";
import { Claim } from "@/lib/claims-data";

export async function getHospitalIdByUserId(userId: string): Promise<string | null> {
  const client = await dbPool.connect();
  try {
    const roleRes = await client.query(`
      SELECT scope_id 
      FROM public.user_role 
      WHERE user_id = $1 AND scope_type = 'HOSPITAL' 
      LIMIT 1
    `, [userId]);

    if (roleRes.rows.length > 0) {
      return roleRes.rows[0].scope_id;
    }
    return null;
  } finally {
    client.release();
  }
}

export async function getHospitalClaims(hospitalId: string | null): Promise<Claim[]> {
  const client = await dbPool.connect();
  try {
    let query = `
      SELECT 
        c.claim_id,
        c.claim_date::text, -- Cast to text for consistent date handling
        c.status,
        c.total_amount,
        p.full_name as client_name,
        d.name as disease_name,
        h.name as hospital_name,
        ct.contract_number as policy_number,
        c.created_at
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.contract ct ON c.contract_id = ct.contract_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      WHERE c.status != 'DRAFT'
    `;
    
    const queryParams: (string | null)[] = [];
    
    if (hospitalId) {
        query += ` AND c.hospital_id = $${queryParams.length + 1}`;
        queryParams.push(hospitalId);
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await client.query(query, queryParams);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.rows.map((row: any) => ({
        ...row,
        total_amount: Number(row.total_amount),
    }));

  } finally {
    client.release();
  }
}

export async function getAgentIdByUserId(userId: string): Promise<string | null> {
  const client = await dbPool.connect();
  try {
    // Check role in app_user table instead of user_role
    // detailed role check to avoid enum errors
    const userRes = await client.query(`
      SELECT role FROM public.app_user WHERE user_id = $1
    `, [userId]);
    
    if (userRes.rows.length > 0) {
        const role = userRes.rows[0].role;
        // Check for both lowercase and uppercase to be safe
        if (role === 'agent' || role === 'AGENT') {
            return userId;
        }
    }
    return null;
  } finally {
    client.release();
  }
}

export async function getAgentClaims(userId: string): Promise<Claim[]> {
  const client = await dbPool.connect();
  try {
    const query = `
      SELECT 
        c.claim_id,
        c.claim_date::text,
        c.status,
        c.total_amount,
        p.full_name as client_name,
        d.name as disease_name,
        h.name as hospital_name,
        ct.contract_number as policy_number,
        c.created_at
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.contract ct ON c.contract_id = ct.contract_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      WHERE c.created_by_user_id = $1
      ORDER BY c.created_at DESC
    `;
    
    const result = await client.query(query, [userId]);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.rows.map((row: any) => ({
        ...row,
        total_amount: Number(row.total_amount),
    }));
  } finally {
    client.release();
  }
}

export async function getAllClaims(): Promise<Claim[]> {
  const client = await dbPool.connect();
  try {
    const query = `
      SELECT 
        c.claim_id,
        c.claim_date::text,
        c.status,
        c.total_amount,
        p.full_name as client_name,
        d.name as disease_name,
        h.name as hospital_name,
        ct.contract_number as policy_number,
        c.created_at
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.contract ct ON c.contract_id = ct.contract_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      ORDER BY c.created_at DESC
      LIMIT 100
    `;
    
    const result = await client.query(query);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.rows.map((row: any) => ({
        ...row,
        total_amount: Number(row.total_amount),
    }));
  } finally {
    client.release();
  }
}