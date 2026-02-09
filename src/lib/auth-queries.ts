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
};

export async function registerUser(params: {
  email: string;
  password: string;
  role: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const result = await dbPool.query(
    `insert into public.app_user (email, password_hash, role, status)
     values ($1, $2, $3, 'PENDING')
     returning user_id, email, role, status`,
    [params.email.toLowerCase(), passwordHash, params.role]
  );
  return result.rows[0] as AppUser;
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
    `select user_id, email, role, created_at
     from public.app_user
     where status = 'PENDING'
     order by created_at desc`
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
