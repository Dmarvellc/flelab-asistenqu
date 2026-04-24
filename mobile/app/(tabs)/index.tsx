import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/context';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

interface Stats {
  totalUsers?: number;
  agents?: number;
  clients?: number;
  totalPolicies?: number;
  totalClaims?: number;
  agencies?: number;
  hospitals?: number;
  activeUsers?: number;
  registrations?: number;
}

interface RecentItem {
  id: string;
  name: string;
  label: string;
  time: string;
  type: 'client' | 'claim' | 'user';
}

function MetricCard({
  label, value, icon, color, gradient, loading,
}: {
  label: string;
  value?: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: readonly [string, string];
  loading?: boolean;
}) {
  return (
    <View style={[styles.metricCard, Shadow.sm]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.metricIcon}
      >
        <Ionicons name={icon} size={18} color="#fff" />
      </LinearGradient>
      <View style={{ marginTop: 14 }}>
        {loading
          ? <View style={styles.skelVal} />
          : <Text style={styles.metricValue}>{(value ?? 0).toLocaleString('id-ID')}</Text>
        }
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ActivityRow({ item }: { item: RecentItem }) {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    client: 'person-add',
    claim: 'document-text',
    user: 'people',
  };
  const colorMap: Record<string, string> = {
    client: Colors.success,
    claim: Colors.accent,
    user: Colors.warning,
  };
  return (
    <View style={styles.actRow}>
      <View style={[styles.actIcon, { backgroundColor: `${colorMap[item.type]}18` }]}>
        <Ionicons name={iconMap[item.type]} size={15} color={colorMap[item.type]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.actLabel}>{item.label}</Text>
      </View>
      <Text style={styles.actTime}>{item.time}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAgent = user?.role === 'agent';
  const isDev = user?.role === 'developer' || user?.role === 'super_admin';

  const fetchData = useCallback(async () => {
    try {
      const endpoint = isDev ? '/api/developer/stats' : '/api/agent/stats';
      const data = await api.get<Stats>(endpoint);
      setStats(data);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDev]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 18 ? 'Selamat Siang' : 'Selamat Malam';

  const metrics = isDev ? [
    { label: 'Total Pengguna', value: stats.totalUsers, icon: 'people' as const, gradient: ['#6366f1', '#818cf8'] as const },
    { label: 'Agensi', value: stats.agencies, icon: 'briefcase' as const, gradient: ['#0ea5e9', '#38bdf8'] as const },
    { label: 'Rumah Sakit', value: stats.hospitals, icon: 'medical' as const, gradient: ['#10b981', '#34d399'] as const },
    { label: 'Total Klaim', value: stats.totalClaims, icon: 'document-text' as const, gradient: ['#f59e0b', '#fbbf24'] as const },
  ] : [
    { label: 'Total Klien', value: stats.clients, icon: 'people' as const, gradient: ['#6366f1', '#818cf8'] as const },
    { label: 'Total Polis', value: stats.totalPolicies, icon: 'shield-checkmark' as const, gradient: ['#10b981', '#34d399'] as const },
    { label: 'Total Klaim', value: stats.totalClaims, icon: 'document-text' as const, gradient: ['#f59e0b', '#fbbf24'] as const },
    { label: 'Agen Aktif', value: stats.agents, icon: 'person-circle' as const, gradient: ['#0ea5e9', '#38bdf8'] as const },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header gradient */}
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || user?.email?.split('@')[0] || 'Pengguna'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="rgba(255,255,255,0.8)" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Role badge */}
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={12} color={Colors.accentLight} />
          <Text style={styles.roleText}>{user?.role?.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan</Text>
          <View style={styles.metricsGrid}>
            {metrics.map(m => (
              <MetricCard key={m.label} {...m} loading={loading} />
            ))}
          </View>
        </View>

        {/* Quick actions */}
        {isAgent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aksi Cepat</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/clients')}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#6366f1', '#818cf8']} style={styles.actionGrad}>
                  <Ionicons name="person-add" size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionLabel}>Tambah Klien</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#10b981', '#34d399']} style={styles.actionGrad}>
                  <Ionicons name="document-text" size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionLabel}>Buat Klaim</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#f59e0b', '#fbbf24']} style={styles.actionGrad}>
                  <Ionicons name="stats-chart" size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionLabel}>Laporan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info card */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#6366f1', '#4f46e5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.infoCard}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Platform Asuransi Digital</Text>
              <Text style={styles.infoSub}>
                Kelola polis, klaim, dan klien Anda dengan mudah melalui aplikasi AsistenQu.
              </Text>
            </View>
            <Ionicons name="shield-checkmark" size={40} color="rgba(255,255,255,0.2)" />
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  greeting: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  userName: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff', maxWidth: 220 },
  notifBtn: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: '#1e293b',
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(99,102,241,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, marginTop: Spacing.md,
  },
  roleText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.accentLight, letterSpacing: 0.5 },

  scroll: { paddingTop: Spacing.lg },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 0.5, marginBottom: Spacing.md, textTransform: 'uppercase',
  },

  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  metricCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  metricIcon: {
    width: 38, height: 38, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  metricValue: {
    fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginBottom: 2,
  },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500' },
  skelVal: { height: 28, width: 60, backgroundColor: '#e2e8f0', borderRadius: 6, marginBottom: 4 },

  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 8 },
  actionGrad: {
    width: 56, height: 56, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.md,
  },
  actionLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },

  actRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  actIcon: {
    width: 34, height: 34, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  actName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  actLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  actTime: { fontSize: FontSize.xs, color: Colors.textMuted },

  infoCard: {
    borderRadius: Radius.lg, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  infoTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#fff', marginBottom: 4 },
  infoSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
});
