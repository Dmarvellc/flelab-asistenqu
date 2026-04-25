import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { logout } from '@/lib/auth';
import { useAuth } from '@/lib/context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

const ROLE_LABELS: Record<string, string> = {
  agent:          'Agen Asuransi',
  developer:      'Developer',
  super_admin:    'Super Admin',
  admin_agency:   'Admin Agensi',
  hospital_admin: 'Admin Rumah Sakit',
};

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={styles.sectionTitle}>{title}</Text>
  );
}

function MenuRow({
  icon, label, subtitle, onPress, rightLabel, danger, last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  rightLabel?: string;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, last && styles.menuRowLast]}
      onPress={onPress}
      activeOpacity={0.55}
    >
      <View style={[styles.menuIconWrap, danger && { backgroundColor: Colors.dangerBg }]}>
        <Ionicons
          name={icon}
          size={17}
          color={danger ? Colors.danger : Colors.textSecondary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
      </View>
      {rightLabel
        ? <Text style={styles.menuRight}>{rightLabel}</Text>
        : <Ionicons name="chevron-forward" size={14} color={Colors.textFaint} />
      }
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();

  const displayName = user?.name || user?.email?.split('@')[0] || 'Pengguna';
  const initials = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  function avatarColor() {
    const sum = [...displayName].reduce((s, c) => s + c.charCodeAt(0), 0);
    return Colors.avatars[sum % Colors.avatars.length];
  }
  const av = avatarColor();

  const handleLogout = () =>
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive',
        onPress: async () => { await logout(); setUser(null); router.replace('/(auth)/login'); },
      },
    ]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity block */}
        <View style={styles.identityBlock}>
          <View style={[styles.avatarCircle, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarLetters, { color: av.text }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
            <View style={[styles.rolePill, { backgroundColor: Colors.accentBg }]}>
              <Text style={[styles.roleText, { color: Colors.accent }]}>
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Account section */}
        <SectionTitle title="Akun" />
        <MenuRow icon="person-outline"       label="Edit Profil"          subtitle="Nama & foto"            onPress={() => {}} />
        <MenuRow icon="lock-closed-outline"  label="Ubah Password"                                          onPress={() => {}} />
        <MenuRow icon="notifications-outline" label="Notifikasi"          subtitle="Preferensi pemberitahuan" onPress={() => {}} last />

        <View style={styles.divider} />

        {/* App section */}
        <SectionTitle title="Aplikasi" />
        <MenuRow icon="information-circle-outline" label="Tentang AsistenQu" rightLabel="v1.0.0" onPress={() => {}} />
        <MenuRow icon="help-circle-outline"        label="Bantuan & Dukungan"                   onPress={() => {}} />
        <MenuRow icon="document-text-outline"      label="Kebijakan Privasi"                    onPress={() => {}} last />

        <View style={styles.divider} />

        {/* Logout */}
        <MenuRow
          icon="log-out-outline"
          label="Keluar"
          onPress={handleLogout}
          danger
          last
        />

        <Text style={styles.footer}>AsistenQu © 2025 · FLELab</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    paddingHorizontal: Spacing.lg, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },

  identityBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarLetters: { fontSize: FontSize.xl, fontWeight: '800' },
  userName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  userEmail: { fontSize: FontSize.sm, color: Colors.textFaint, marginBottom: 8 },
  rolePill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  roleText: { fontSize: FontSize.xxs, fontWeight: '700', letterSpacing: 0.3 },

  divider: { height: 8, backgroundColor: Colors.bgSubtle, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },

  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textFaint,
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: Spacing.lg, paddingTop: 20, paddingBottom: 6,
  },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 32, height: 32, borderRadius: Radius.md,
    backgroundColor: Colors.bgSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  menuSub: { fontSize: FontSize.xs, color: Colors.textFaint, marginTop: 1 },
  menuRight: { fontSize: FontSize.sm, color: Colors.textFaint, fontWeight: '500' },

  footer: {
    textAlign: 'center', fontSize: FontSize.xs,
    color: Colors.textFaint, marginTop: 32, marginBottom: 8,
  },
});
