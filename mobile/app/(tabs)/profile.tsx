import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { logout } from '@/lib/auth';
import { useAuth } from '@/lib/context';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  rightEl?: React.ReactNode;
}

function MenuItem({ icon, label, subtitle, onPress, danger, rightEl }: MenuItemProps) {
  const color = danger ? Colors.danger : Colors.text;
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? '#fef2f2' : Colors.background }]}>
        <Ionicons name={icon} size={18} color={danger ? Colors.danger : Colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      {rightEl ?? <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.sectionCard, Shadow.sm]}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();

  const roleLabelMap: Record<string, string> = {
    agent: 'Agen Asuransi',
    developer: 'Developer',
    super_admin: 'Super Admin',
    admin_agency: 'Admin Agensi',
    hospital_admin: 'Admin Rumah Sakit',
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar dari akun ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar', style: 'destructive',
          onPress: async () => {
            await logout();
            setUser(null);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const initials = (user?.name || user?.email || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'Pengguna'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>
                {roleLabelMap[user?.role ?? ''] ?? user?.role}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Akun">
          <MenuItem
            icon="person-outline"
            label="Edit Profil"
            subtitle="Ubah nama & foto"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="lock-closed-outline"
            label="Ubah Password"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="notifications-outline"
            label="Notifikasi"
            subtitle="Atur preferensi notifikasi"
            onPress={() => {}}
          />
        </Section>

        <Section title="Aplikasi">
          <MenuItem
            icon="information-circle-outline"
            label="Tentang AsistenQu"
            subtitle="Versi 1.0.0"
            onPress={() => {}}
            rightEl={<Text style={styles.version}>v1.0.0</Text>}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="help-circle-outline"
            label="Bantuan & Dukungan"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="document-text-outline"
            label="Kebijakan Privasi"
            onPress={() => {}}
          />
        </Section>

        <Section title="">
          <MenuItem
            icon="log-out-outline"
            label="Keluar"
            onPress={handleLogout}
            danger
          />
        </Section>

        <Text style={styles.footNote}>AsistenQu © 2025 · FLELab</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 64, height: 64, borderRadius: Radius.full,
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.accentLight },
  userName: { fontSize: FontSize.lg, fontWeight: '800', color: '#fff', marginBottom: 2 },
  userEmail: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3,
  },
  roleText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.accentLight },

  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  sectionCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, overflow: 'hidden' },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.md,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: FontSize.md, fontWeight: '600' },
  menuSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 60 },
  version: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },

  footNote: {
    textAlign: 'center', fontSize: FontSize.xs,
    color: Colors.textMuted, marginTop: Spacing.xl,
  },
});
