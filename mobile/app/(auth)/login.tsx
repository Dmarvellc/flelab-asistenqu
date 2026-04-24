import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Dimensions, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { login } from '@/lib/auth';
import { useAuth } from '@/lib/context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await login(email.trim().toLowerCase(), password);
      setUser(user);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Login gagal. Periksa kembali kredensial Anda.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#0f2850']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* Top branding */}
        <View style={styles.branding}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>AQ</Text>
          </View>
          <Text style={styles.appName}>AsistenQu</Text>
          <Text style={styles.tagline}>Platform Asuransi Terpercaya</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Masuk ke Akun</Text>
          <Text style={styles.cardSub}>Gunakan email & password yang terdaftar</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldLabel}>
            <Ionicons name="mail-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.labelText}>Alamat Email</Text>
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              placeholder="nama@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={[styles.fieldLabel, { marginTop: Spacing.md }]}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.labelText}>Password</Text>
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showPw ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textMuted}
              />
            </Pressable>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#6366f1', '#818cf8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginGradient}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Masuk</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2025 FLELab · AsistenQu</Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },

  branding: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 72, height: 72, borderRadius: Radius.xl,
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.5)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  logoText: { fontSize: 26, fontWeight: '800', color: '#818cf8', letterSpacing: 1 },
  appName: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  tagline: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  cardTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  cardSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: Radius.md,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: Spacing.md,
  },
  errorText: { fontSize: FontSize.sm, color: '#ef4444', flex: 1 },

  fieldLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6,
  },
  labelText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.3 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
  },
  input: {
    height: 48, fontSize: FontSize.md,
    color: Colors.text, flex: 1,
  },
  eyeBtn: { padding: 6 },

  loginBtn: { marginTop: Spacing.xl, borderRadius: Radius.md, overflow: 'hidden' },
  loginGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  footer: {
    textAlign: 'center', fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.25)', marginTop: Spacing.xl,
  },
});
