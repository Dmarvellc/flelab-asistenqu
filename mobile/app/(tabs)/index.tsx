import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface Stats {
  totalUsers?: number; agents?: number; clients?: number;
  totalPolicies?: number; totalClaims?: number;
  agencies?: number; hospitals?: number; activeUsers?: number;
}

function avatarColor(name: string) {
  const sum = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return Colors.avatars[sum % Colors.avatars.length];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isDev = user?.role === 'developer' || user?.role === 'super_admin';
  const isAgent = user?.role === 'agent';

  const fetchData = useCallback(async () => {
    try {
      const endpoint = isDev ? '/api/developer/stats' : '/api/agent/stats';
      const data = await api.get<Stats>(endpoint);
      setStats(data);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDev]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 18 ? 'Selamat Siang' : 'Selamat Malam';
  const displayName = user?.name || user?.email?.split('@')[0] || 'Pengguna';
  const av = avatarColor(displayName);

  const metrics = isDev ? [
    { label: 'Total Pengguna', value: stats.totalUsers,   icon: 'people' as const,        color: Colors.accent },
    { label: 'Agensi',         value: stats.agencies,     icon: 'briefcase' as const,     color: '#0284c7' },
    { label: 'Rumah Sakit',    value: stats.hospitals,    icon: 'medical' as const,       color: Colors.success },
    { label: 'Total Klaim',    value: stats.totalClaims,  icon: 'document-text' as const, color: Colors.warning },
  ] : [
    { label: 'Total Klien',    value: stats.clients,        icon: 'people' as const,           color: Colors.accent },
    { label: 'Total Polis',    value: stats.totalPolicies,  icon: 'shield-checkmark' as const, color: Colors.success },
    { label: 'Total Klaim',    value: stats.totalClaims,    icon: 'document-text' as const,    color: Colors.violet },
    { label: 'Agen Aktif',     value: stats.agents,         icon: 'person-circle' as const,    color: '#0284c7' },
  ];

  const quickActions = [
    { icon: 'person-add' as const,    label: 'Tambah Klien', color: Colors.accent },
    { icon: 'document-text' as const, label: 'Buat Klaim',   color: Colors.success },
    { icon: 'stats-chart' as const,   label: 'Laporan',      color: Colors.warning },
    { icon: 'settings' as const,      label: 'Pengaturan',   color: Colors.textMuted },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.avatarText, { color: av.text }]}>
            {displayName[0]?.toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.textMuted} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Metrics section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Ringkasan</Text>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((m, i) => (
            <View
              key={m.label}
              style={[
                styles.metricCell,
                i % 2 === 0 && styles.metricCellRight,
                i < 2 && styles.metricCellBottom,
              ]}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: `${m.color}14` }]}>
                <Ionicons name={m.icon} size={15} color={m.color} />
              </View>
              <Text style={styles.metricLabel}>{m.label}</Text>
              {loading
                ? <View style={styles.skel} />
                : <Text style={[styles.metricValue, { color: m.color }]}>
                    {(m.value ?? 0).toLocaleString('id-ID')}
                  </Text>
              }
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        {isAgent && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionLabel}>Aksi Cepat</Text>
            </View>
            <View style={styles.actionsGrid}>
              {quickActions.map(a => (
                <TouchableOpacity key={a.label} style={styles.actionItem} activeOpacity={0.6}>
                  <View style={[styles.actionIcon, { backgroundColor: `${a.color}14` }]}>
                    <Ionicons name={a.icon} size={20} color={a.color} />
                  </View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Role info row */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionLabel}>Akun</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoRowLabel}>Peran</Text>
            <Text style={styles.infoRowValue}>
              {user?.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
          </View>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Ionicons name="mail-outline" size={16} color={Colors.textFaint} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoRowLabel}>Email</Text>
            <Text style={styles.infoRowValue}>{user?.email}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 12, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FontSize.sm, color: Colors.textFaint, marginBottom: 2 },
  userName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  avatar: {
    width: 40, height: 40, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.md, fontWeight: '800' },

  sectionHeader: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textFaint,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderWidth: 1, borderColor: Colors.border,
    marginHorizontal: Spacing.lg, borderRadius: Radius.xl, overflow: 'hidden',
  },
  metricCell: {
    width: '50%', padding: Spacing.lg, gap: 6,
  },
  metricCellRight: { borderRightWidth: 1, borderRightColor: Colors.border },
  metricCellBottom: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  metricIconWrap: {
    width: 30, height: 30, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textFaint, fontWeight: '600' },
  metricValue: { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  skel: { height: 28, width: 56, backgroundColor: Colors.border, borderRadius: 6 },

  actionsGrid: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 8,
  },
  actionItem: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: Spacing.md },
  actionIcon: {
    width: 48, height: 48, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: {
    fontSize: FontSize.xxs, fontWeight: '600', color: Colors.textSecondary,
    textAlign: 'center',
  },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoRowLabel: { fontSize: FontSize.xs, color: Colors.textFaint, fontWeight: '600', marginBottom: 1 },
  infoRowValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
});
