import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface Claim {
  claim_id: string;
  claim_number: string;
  client_name: string;
  status: string;
  amount: number;
  submitted_at: string;
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Menunggu',  color: Colors.warning,  bg: Colors.warningBg },
  REVIEW:   { label: 'Ditinjau', color: Colors.blue,     bg: Colors.blueBg },
  APPROVED: { label: 'Disetujui', color: Colors.success,  bg: Colors.successBg },
  REJECTED: { label: 'Ditolak',  color: Colors.danger,   bg: Colors.dangerBg },
  PAID:     { label: 'Dibayar',  color: Colors.success,  bg: Colors.successBg },
};

const FILTERS = [
  { key: '',         label: 'Semua' },
  { key: 'PENDING',  label: 'Menunggu' },
  { key: 'REVIEW',   label: 'Ditinjau' },
  { key: 'APPROVED', label: 'Disetujui' },
];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ClaimRow({ item, last }: { item: Claim; last?: boolean }) {
  const cfg = STATUS[item.status] ?? STATUS['PENDING'];
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowLeft}>
        <View style={styles.rowTop}>
          <Text style={styles.claimNum}>{item.claim_number}</Text>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.clientName} numberOfLines={1}>{item.client_name}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.amount}>{fmtCurrency(item.amount)}</Text>
        <Text style={styles.date}>{fmtDate(item.submitted_at)}</Text>
      </View>
    </View>
  );
}

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
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const pending = claims.filter(c => c.status === 'PENDING').length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.pageTitle}>Klaim</Text>
            <Text style={styles.pageCount}>{claims.length.toLocaleString('id-ID')} klaim</Text>
          </View>
          {pending > 0 && (
            <View style={[styles.pendingPill, { backgroundColor: Colors.warningBg }]}>
              <Text style={[styles.pendingText, { color: Colors.warning }]}>{pending} menunggu</Text>
            </View>
          )}
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.textMuted} /></View>
      ) : (
        <FlatList
          data={claims}
          keyExtractor={item => item.claim_id}
          renderItem={({ item, index }) => (
            <ClaimRow item={item} last={index === claims.length - 1} />
          )}
          contentContainerStyle={[
            { paddingBottom: insets.bottom + 80 },
            claims.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={28} color={Colors.textFaint} />
              <Text style={styles.emptyText}>Belum ada klaim</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchClaims(); }}
              tintColor={Colors.textMuted}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 10,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 14,
  },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  pageCount: { fontSize: FontSize.sm, color: Colors.textFaint, marginTop: 2 },
  pendingPill: {
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  pendingText: { fontSize: FontSize.xs, fontWeight: '700' },

  filterScroll: { marginHorizontal: -Spacing.lg },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.lg, paddingBottom: 2 },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderMid,
  },
  filterTabActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  filterText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted },
  filterTextActive: { color: '#fff' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLeft: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  claimNum: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  statusPill: {
    borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2,
  },
  statusText: { fontSize: FontSize.xxs, fontWeight: '700' },
  clientName: { fontSize: FontSize.xs, color: Colors.textFaint },

  rowRight: { alignItems: 'flex-end', gap: 3 },
  amount: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text },
  date: { fontSize: FontSize.xxs, color: Colors.textFaint },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: FontSize.md, color: Colors.textFaint, fontWeight: '500' },
});
