import { createClient } from '@supabase/supabase-js';

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function normalizeEnvValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const unquoted = trimmed.replace(/^(['"])(.*)\1$/, "$2").trim();
  return unquoted || null;
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getSupabaseAdminConfig() {
  const supabaseUrl = normalizeEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const supabaseKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  let configError: string | null = null;

  if (!supabaseUrl) {
    configError = "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).";
  } else if (!isValidHttpUrl(supabaseUrl)) {
    configError = "NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS URL.";
  } else if (!supabaseKey) {
    configError = "Missing SUPABASE_SERVICE_ROLE_KEY.";
  }

  return {
    supabaseUrl,
    supabaseKey,
    configError,
  };
}

export function hasSupabaseAdminConfig() {
  const { configError } = getSupabaseAdminConfig();
  return configError === null;
}

export function getSupabaseAdminConfigError() {
  return getSupabaseAdminConfig().configError;
}

export function getSupabaseAdmin() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const { supabaseUrl, supabaseKey, configError } = getSupabaseAdminConfig();
  if (configError || !supabaseUrl || !supabaseKey) {
    throw new Error(
      `Supabase admin client is not configured. ${configError ?? "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."}`
    );
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}
