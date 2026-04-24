import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearSession, storeSessionCookie } from './api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://asistenqu.vercel.app';
const USER_KEY = 'current_user';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  name?: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) await storeSessionCookie(setCookie);

  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Login gagal');

  const user: AuthUser = {
    userId: body.userId ?? body.user_id ?? '',
    email: body.email ?? email,
    role: body.role ?? '',
    name: body.name ?? '',
  };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function logout() {
  const cookie = await import('./api').then(m => m.getStoredCookie());
  await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: cookie ? { Cookie: cookie } : {},
  }).catch(() => {});
  await clearSession();
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}
