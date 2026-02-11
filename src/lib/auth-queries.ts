import "server-only";
import bcrypt from "bcryptjs";
import { dbPool } from "@/lib/db";

export type AppUser = {
  user_id: string;
  email: string;
  role: string;
  status: string;
};

export type PendingUser = {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
  full_name?: string;
  nik?: string;
  phone_number?: string;
  address?: string;
  birth_date?: string;
  gender?: string;
};

export async function registerUser(params: {
  email: string;
  password: string;
  role: string;
  fullName?: string;
  nik?: string;
  phoneNumber?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    // 1. Create User
    const userRes = await client.query(
      `insert into public.app_user (email, password_hash, role, status)
       values ($1, $2, $3, 'PENDING')
       returning user_id, email, role, status`,
      [params.email.toLowerCase(), passwordHash, params.role]
    );
    const user = userRes.rows[0];

    // 2. Create Person (if details provided)
    if (params.fullName) {
      const personRes = await client.query(
        `insert into public.person (full_name, id_card, phone_number, address, birth_date, gender)
         values ($1, $2, $3, $4, $5, $6)
         returning person_id`,
        [
          params.fullName,
          params.nik,
          params.phoneNumber,
          params.address,
          params.birthDate || null,
          params.gender,
        ]
      );
      const personId = personRes.rows[0].person_id;

      // 3. Link User and Person
      await client.query(
        `insert into public.user_person_link (user_id, person_id, relation_type)
         values ($1, $2, 'OWNER')`,
        [user.user_id, personId]
      );

    }

    await client.query("COMMIT");
    return user as AppUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createActiveUser(params: {
  email: string;
  password: string;
  role: string;
  approvedBy?: string | null;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const result = await dbPool.query(
    `insert into public.app_user (email, password_hash, role, status, approved_at, approved_by)
     values ($1, $2, $3, 'ACTIVE', now(), $4)
     returning user_id, email, role, status`,
    [
      params.email.toLowerCase(),
      passwordHash,
      params.role,
      params.approvedBy ?? null,
    ]
  );
  return result.rows[0] as AppUser;
}

export async function approveUser(params: { userId: string; approvedBy?: string | null }) {
  const result = await dbPool.query(
    `update public.app_user
     set status = 'ACTIVE', approved_at = now(), approved_by = $2
     where user_id = $1
     returning user_id, email, role, status`,
    [params.userId, params.approvedBy ?? null]
  );
  return result.rows[0] as AppUser | undefined;
}

export async function findUserByEmail(email: string) {
  const result = await dbPool.query(
    `select user_id, email, role, status, password_hash
     from public.app_user
     where email = $1`,
    [email.toLowerCase()]
  );
  return result.rows[0] as
    | (AppUser & { password_hash: string })
    | undefined;
}

export async function listPendingUsers(): Promise<PendingUser[]> {
  const result = await dbPool.query(
    `select
       u.user_id,
       u.email,
       u.role,
       u.created_at,
       p.full_name,
       p.id_card as nik,
       p.phone_number,
       p.address,
       p.birth_date,
       p.gender
     from public.app_user u
     left join public.user_person_link l on u.user_id = l.user_id
     left join public.person p on l.person_id = p.person_id
     where u.status = 'PENDING'
     order by u.created_at desc`
  );
  return result.rows as PendingUser[];
}

export async function verifyPassword(params: {
  email: string;
  password: string;
}) {
  const user = await findUserByEmail(params.email);
  if (!user) return null;
  const match = await bcrypt.compare(params.password, user.password_hash);
  if (!match) return null;
  return user;
}

export async function getSystemStats() {
  const client = await dbPool.connect();
  try {
    const totalUsersRes = await client.query("SELECT COUNT(*) FROM public.app_user");
    const activeUsersRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE status = 'ACTIVE'");
    const pendingUsersRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE status = 'PENDING'");

    // Role breakdown
    const roleStatsRes = await client.query("SELECT role, COUNT(*) as count FROM public.app_user GROUP BY role");
    const roleStats = roleStatsRes.rows.reduce((acc, row) => {
      acc[row.role] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);

    // For growth, let's compare current month vs previous month
    const currentMonthRes = await client.query(
      "SELECT COUNT(*) FROM public.app_user WHERE created_at >= date_trunc('month', current_date)"
    );
    const lastMonthRes = await client.query(
      "SELECT COUNT(*) FROM public.app_user WHERE created_at >= date_trunc('month', current_date - interval '1 month') AND created_at < date_trunc('month', current_date)"
    );

    const totalUsers = parseInt(totalUsersRes.rows[0].count, 10);
    const activeUsers = parseInt(activeUsersRes.rows[0].count, 10);
    const pendingUsers = parseInt(pendingUsersRes.rows[0].count, 10);
    const currentMonthUsers = parseInt(currentMonthRes.rows[0].count, 10);
    const lastMonthUsers = parseInt(lastMonthRes.rows[0].count, 10);

    let growthPercentage = 0;
    if (lastMonthUsers > 0) {
      growthPercentage = ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100;
    } else if (currentMonthUsers > 0) {
      growthPercentage = 100; // If no users last month but some this month
    }

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      roleStats,
      currentMonthUsers,
      growthPercentage: growthPercentage.toFixed(1),
    };
  } finally {
    client.release();
  }
}
