import "server-only";
import bcrypt from "bcryptjs";
import { dbPool } from "@/lib/db";

const E164_PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

function normalizePhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(/[^\d+]/g, "");

  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (normalized.startsWith("+")) {
    normalized = `+${normalized.slice(1).replace(/\+/g, "")}`;
  } else {
    normalized = normalized.replace(/\+/g, "");

    // Common Indonesian local format (08xx...) -> +628xx...
    if (normalized.startsWith("0")) {
      normalized = `+62${normalized.slice(1)}`;
    } else if (normalized.startsWith("62")) {
      normalized = `+${normalized}`;
    }
  }

  return E164_PHONE_REGEX.test(normalized) ? normalized : null;
}

function parsePhoneNumberOrThrow(phone?: string | null): string | null {
  if (!phone || !phone.trim()) return null;
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    throw new Error("Invalid phone number format. Use international format like +628123456789.");
  }
  return normalized;
}

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
  ktp_image_path?: string;
  selfie_image_path?: string;
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
  ktpImagePath?: string;
  selfieImagePath?: string;
  agencyId?: string;
  referralCode?: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    // 1. Create User in auth.users FIRST (to satisfy FK constraints)
    // We generate a UUID for the user ID so we can use it in both tables
    const idRes = await client.query("SELECT gen_random_uuid() as id");
    const userId = idRes.rows[0].id;

    await client.query(`
        INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
        VALUES ($1, $2, $3, 'authenticated', 'authenticated', NOW(), NOW())
    `, [userId, params.email.toLowerCase(), passwordHash]);

    // 2. Create User in public.app_user
    const userRes = await client.query(
      `insert into public.app_user (user_id, email, password_hash, role, status, agency_id)
       values ($1, $2, $3, $4, 'PENDING', $5)
       returning user_id, email, role, status, agency_id`,
      [userId, params.email.toLowerCase(), passwordHash, params.role, params.agencyId || null]
    );
    const user = userRes.rows[0];

    // 3. Create Person (if details provided)
    let personId = null;
    if (params.fullName) {
      const normalizedPhone = parsePhoneNumberOrThrow(params.phoneNumber);
      const personRes = await client.query(
        `insert into public.person (full_name, id_card, phone_number, address, birth_date, gender, ktp_image_path, selfie_image_path)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning person_id`,
        [
          params.fullName,
          params.nik,
          normalizedPhone,
          params.address,
          params.birthDate || null,
          params.gender,
          params.ktpImagePath || null,
          params.selfieImagePath || null,
        ]
      );
      personId = personRes.rows[0].person_id;

      // 4. Link User and Person
      await client.query(
        `insert into public.user_person_link (user_id, person_id, relation_type)
         values ($1, $2, 'OWNER')`,
        [user.user_id, personId]
      );
    }

    // 5. Create Agent Record if role is 'agent' (FIX: Ensure agent data enters database)
    if (params.role === 'agent' && personId) {
      // We need an insurance_id. Let's find or create a default one.
      let insuranceId;
      const insRes = await client.query("SELECT insurance_id FROM public.insurance LIMIT 1");
      if (insRes.rows.length > 0) {
        insuranceId = insRes.rows[0].insurance_id;
      } else {
        const newIns = await client.query("INSERT INTO public.insurance (insurance_name) VALUES ('Independent') RETURNING insurance_id");
        insuranceId = newIns.rows[0].insurance_id;
      }

      // Use user_id as agent_id for consistency
      // Note: We are using user_id as agent_id. This is a design choice to allow easy lookup.
      try {
        await client.query(
          `INSERT INTO public.agent (agent_id, agent_name, insurance_id, status, person_id)
                 VALUES ($1, $2, $3, 'PENDING', $4)`,
          [userId, params.fullName, insuranceId, personId]
        );
      } catch (e) {
        // If the person_id column doesn't exist yet (migration didn't run), fallback to old insert without person_id
        await client.query(
          `INSERT INTO public.agent (agent_id, agent_name, insurance_id, status)
                 VALUES ($1, $2, $3, 'PENDING')`,
          [userId, params.fullName, insuranceId]
        );
      }
    }

    // 6. Process Referral Code if provided
    if (params.referralCode) {
      const referrerRes = await client.query(`
        SELECT agent_id FROM public.agent WHERE referral_code = $1
      `, [params.referralCode.toUpperCase()]);

      if (referrerRes.rows.length > 0) {
        const referrerId = referrerRes.rows[0].agent_id;
        
        // Add to history
        await client.query(`
          INSERT INTO public.referral_history (referrer_id, referred_user_id, reward_amount)
          VALUES ($1, $2, $3)
        `, [referrerId, userId, 1000]); // Reward Rp 1000

        // Increment wallet
        await client.query(`
          UPDATE public.agent SET wallet_balance = COALESCE(wallet_balance, 0) + 1000 WHERE agent_id = $1
        `, [referrerId]);
      } else {
        // Also check if they used old app_user schema
        const legacyRes = await client.query(`
           SELECT user_id FROM public.app_user WHERE referral_code = $1
        `, [params.referralCode.toUpperCase()]);

        if (legacyRes.rows.length > 0) {
           const referrerId = legacyRes.rows[0].user_id;
           await client.query(`
             INSERT INTO public.referral_history (referrer_id, referred_user_id, reward_amount)
             VALUES ($1, $2, $3)
           `, [referrerId, userId, 1000]);

           await client.query(`
             UPDATE public.agent SET wallet_balance = COALESCE(wallet_balance, 0) + 1000 WHERE agent_id = $1
           `, [referrerId]).catch(() => {});
        }
      }
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
  profile?: {
    fullName?: string;
    nik?: string;
    phoneNumber?: string;
    address?: string;
    birthDate?: string;
    gender?: string;
  };
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    // Generate ID
    const idRes = await client.query("SELECT gen_random_uuid() as id");
    const userId = idRes.rows[0].id;

    // Insert into auth.users
    await client.query(`
        INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
        VALUES ($1, $2, $3, 'authenticated', 'authenticated', NOW(), NOW())
    `, [userId, params.email.toLowerCase(), passwordHash]);

    // Insert into app_user (agency_id set later if admin_agency)
    const result = await client.query(
      `insert into public.app_user (user_id, email, password_hash, role, status, approved_at, approved_by)
         values ($1, $2, $3, $4, 'ACTIVE', now(), $5)
         returning user_id, email, role, status`,
      [
        userId,
        params.email.toLowerCase(),
        passwordHash,
        params.role,
        params.approvedBy ?? null,
      ]
    );

    // Create Person (if profile details provided)
    if (params.profile && (params.profile.fullName || params.profile.nik)) {
      const normalizedPhone = parsePhoneNumberOrThrow(params.profile.phoneNumber);
      const personRes = await client.query(
        `insert into public.person (full_name, id_card, phone_number, address, birth_date, gender)
         values ($1, $2, $3, $4, $5, $6)
         returning person_id`,
        [
          params.profile.fullName,
          params.profile.nik,
          normalizedPhone,
          params.profile.address,
          params.profile.birthDate || null,
          params.profile.gender,
        ]
      );
      const personId = personRes.rows[0].person_id;

      // Link User and Person
      await client.query(
        `insert into public.user_person_link (user_id, person_id, relation_type)
         values ($1, $2, 'OWNER')`,
        [userId, personId]
      );
    }

    // Create entity record and role mapping based on role
    if (params.role === 'hospital_admin') {
      const hospitalRes = await client.query(
        `INSERT INTO public.hospital (name, address) VALUES ($1, $2) RETURNING hospital_id`,
        [params.profile?.fullName || 'Hospital', params.profile?.address || null]
      );
      const hospitalId = hospitalRes.rows[0].hospital_id;

      await client.query(
        `INSERT INTO public.user_role (user_id, scope_type, scope_id) VALUES ($1, 'HOSPITAL', $2)`,
        [userId, hospitalId]
      );
    } else if (params.role === 'admin_agency') {
      const agencyRes = await client.query(
        `INSERT INTO public.agency (name, address) VALUES ($1, $2) RETURNING agency_id`,
        [params.profile?.fullName || 'Agency', params.profile?.address || null]
      );
      const agencyId = agencyRes.rows[0].agency_id;

      await client.query(
        `UPDATE public.app_user SET agency_id = $1 WHERE user_id = $2`,
        [agencyId, userId]
      );
    }

    await client.query("COMMIT");
    return result.rows[0] as AppUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
       p.gender,
       p.ktp_image_path,
       p.selfie_image_path
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

export async function findUserWithProfile(userId: string) {
  const result = await dbPool.query(
    `select
       u.user_id,
       u.email,
       u.role,
       u.status,
       u.created_at,
       u.agency_id,
       ag.name as agency_name,
       ag.address as agency_address,
       ag.claim_form_url,
       p.full_name,
       p.id_card as nik,
       p.phone_number,
       p.address,
       p.birth_date,
       p.gender,
       p.ktp_image_path,
       p.selfie_image_path
     from public.app_user u
     left join public.user_person_link l on u.user_id = l.user_id
     left join public.person p on l.person_id = p.person_id
     left join public.agency ag on u.agency_id = ag.agency_id
     where u.user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

export async function updateUserProfile(userId: string, data: {
  fullName: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: string;
  nik: string;
  ktpImagePath?: string | null;
  selfieImagePath?: string | null;
}) {
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");
    const normalizedPhone = parsePhoneNumberOrThrow(data.phone);

    // Check if link exists
    const linkRes = await client.query(
      "select person_id from public.user_person_link where user_id = $1",
      [userId]
    );

    let personId;

    if (linkRes.rows.length === 0) {
      // Create Person
      const personRes = await client.query(
        `insert into public.person (full_name, id_card, phone_number, address, birth_date, gender, ktp_image_path, selfie_image_path)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning person_id`,
        [data.fullName, data.nik, normalizedPhone, data.address, data.birthDate || null, data.gender, data.ktpImagePath || null, data.selfieImagePath || null]
      );
      personId = personRes.rows[0].person_id;

      // Link
      await client.query(
        `insert into public.user_person_link (user_id, person_id, relation_type)
         values ($1, $2, 'OWNER')`,
        [userId, personId]
      );
    } else {
      personId = linkRes.rows[0].person_id;
      // Update Person
      await client.query(
        `update public.person
         set full_name = $1, id_card = $2, phone_number = $3, address = $4, birth_date = $5, gender = $6,
             ktp_image_path = coalesce($7, ktp_image_path),
             selfie_image_path = coalesce($8, selfie_image_path)
         where person_id = $9`,
        [data.fullName, data.nik, normalizedPhone, data.address, data.birthDate || null, data.gender, data.ktpImagePath || null, data.selfieImagePath || null, personId]
      );
    }

    await client.query("COMMIT");

    // Keep agent.agent_name in sync with person.full_name (if this user is an agent)
    try {
      await dbPool.query(
        `UPDATE public.agent SET agent_name = $1, updated_at = NOW() WHERE agent_id = $2`,
        [data.fullName, userId]
      );
    } catch (_) {
      // Not an agent, ignore
    }

    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
