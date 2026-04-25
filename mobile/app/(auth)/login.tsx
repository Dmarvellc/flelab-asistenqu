import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { login } from '@/lib/auth';
import { useAuth } from '@/lib/context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Email dan password wajib diisi'); return; }
    setLoading(true); setError('');
    try {
      const user = await login(email.trim().toLowerCase(), password);
      setUser(user);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Login gagal. Periksa kembali kredensial Anda.');
    } finally { setLoading(false); }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Brand */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetters}>AQ</Text>
            </View>
            <Text style={styles.appName}>AsistenQu</Text>
            <Text style={styles.tagline}>Platform Manajemen Asuransi</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Masuk ke Akun</Text>
            <Text style={styles.formSub}>Gunakan email & password yang terdaftar</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Alamat Email</Text>
              <View style={[styles.inputRow, error && email === '' && styles.inputErr]}>
                <Ionicons name="mail-outline" size={16} color={Colors.textFaint} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={t => { setEmail(t); setError(''); }}
                  placeholder="nama@email.com"
                  placeholderTextColor={Colors.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.textFaint} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={t => { setPassword(t); setError(''); }}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textFaint}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPw(v => !v)} hitSlop={8}>
                  <Ionicons
                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={Colors.textFaint}
                  />
                </Pressable>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Masuk</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>© 2025 FLELab · AsistenQu</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg },

  brand: { alignItems: 'center', paddingTop: 64, paddingBottom: 48 },
  logoBox: {
    width: 64, height: 64, borderRadius: Radius.xl,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoLetters: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  appName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: FontSize.sm, color: Colors.textFaint, marginTop: 4 },

  form: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.xl, padding: Spacing.xl,
  },
  formTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  formSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xl },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.dangerBg, borderRadius: Radius.md,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: Spacing.md,
  },
  errorText: { fontSize: FontSize.sm, color: Colors.danger, flex: 1 },

  fieldWrap: { marginBottom: Spacing.md },
  fieldLabel: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.borderMid,
    borderRadius: Radius.md, paddingHorizontal: 12, height: 48,
    backgroundColor: Colors.bgSubtle,
  },
  inputErr: { borderColor: Colors.danger },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.text },

  btn: {
    height: 52, borderRadius: Radius.md,
    backgroundColor: Colors.text,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },

  footer: {
    textAlign: 'center', fontSize: FontSize.xs,
    color: Colors.textFaint, marginTop: Spacing.xl,
  },
});
