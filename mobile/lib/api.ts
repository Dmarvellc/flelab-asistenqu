import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://asistenqu.vercel.app';
const COOKIE_KEY = 'session_cookie';

export async function getStoredCookie(): Promise<string | null> {
  return AsyncStorage.getItem(COOKIE_KEY);
}

export async function storeSessionCookie(cookieHeader: string) {
  const match = cookieHeader.match(/session=[^;]+/);
  if (match) await AsyncStorage.setItem(COOKIE_KEY, match[0]);
}

export async function clearSession() {
  await AsyncStorage.removeItem(COOKIE_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookie = await getStoredCookie();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) await storeSessionCookie(setCookie);

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(res.status, body.error ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
};
