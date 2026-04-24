import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

interface Claim {
  claim_id: string;
  claim_number: string;
  client_name: string;
  status: string;
  amount: number;
  submitted_at: string;
  claim_type?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING:   { label: 'Menunggu',  color: '#b45309', bg: '#fef3c7', icon: 'time-outline' },
  REVIEW:    { label: 'Ditinjau', color: '#1e40af', bg: '#dbeafe', icon: 'eye-outline' },
  APPROVED:  { label: 'Disetujui', color: '#065f46', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  REJECTED:  { label: 'Ditolak',  color: '#9f1239', bg: '#ffe4e6', icon: 'close-circle-outline' },
  PAID:      { label: 'Dibayar',  color: '#065f46', bg: '#d1fae5', icon: 'cash-outline' },
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ClaimCard({ item }: { item: Claim }) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['PENDING'];
  return (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.claimNum}>{item.claim_number}</Text>
          <Text style={styles.clientName} numberOfLines={1}>{item.client_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.amount}>{fmtCurrency(item.amount)}</Text>
        <Text style={styles.date}>{fmtDate(item.submitted_at)}</Text>
      </View>
    </View>
  );
}

const FILTER_TABS = [
  { key: '', label: 'Semua' },
  { key: 'PENDING', label: 'Menunggu' },
  { key: 'REVIEW', label: 'Ditinjau' },
  { key: 'APPROVED', label: 'Disetujui' },
];

export default function ClaimsScreen() {
  const insets = useSafeAreaInsets();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchClaims = useCallback(async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await api.get<{ data: Claim[] }>(`/api/agent/claims${params}`);
      setClaims(res.data ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const totalPending = claims.filter(c => c.status === 'PENDING').length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Text style={styles.headerTitle}>Klaim</Text>
        {totalPending > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{totalPending} menunggu</Text>
          </View>
        )}
      </LinearGradient>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={claims}
          keyExtractor={item => item.claim_id}
          renderItem={({ item }) => <ClaimCard item={item} />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
            claims.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Belum ada klaim</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchClaims(); }}
              tintColor={Colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  pendingBadge: {
    backgroundColor: '#fbbf24',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  pendingText: { fontSize: FontSize.xs, fontWeight: '700', color: '#92400e' },

  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Colors.background,
  },
  filterTabActive: { backgroundColor: Colors.accent },
  filterText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.lg, gap: 10 },

  card: {
    backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: Spacing.md,
  },
  claimNum: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  clientName: { fontSize: FontSize.xs, color: Colors.textMuted, maxWidth: 200 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  amount: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  date: { fontSize: FontSize.xs, color: Colors.textMuted },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '500' },
});
