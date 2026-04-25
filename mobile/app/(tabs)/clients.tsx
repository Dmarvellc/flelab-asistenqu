import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface Client {
  client_id: string;
  full_name: string;
  status: string;
  created_at: string;
  agent_name: string | null;
  agency_name: string | null;
  total_policies: number;
  total_claims: number;
}

function avatarColor(name: string) {
  const sum = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return Colors.avatars[sum % Colors.avatars.length];
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Hari ini';
  if (days < 30) return `${days}h lalu`;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ClientRow({ client, onPress, last }: { client: Client; onPress: () => void; last?: boolean }) {
  const av = avatarColor(client.full_name);
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.55}
    >
      <View style={[styles.avatar, { backgroundColor: av.bg }]}>
        <Text style={[styles.avatarText, { color: av.text }]}>
          {client.full_name[0]?.toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{client.full_name}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {client.agent_name ?? '—'}
          {client.agency_name ? ` · ${client.agency_name}` : ''}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={styles.polisTag}>
          <Text style={styles.polisTagText}>{client.total_policies} polis</Text>
        </View>
        <Text style={styles.rowDate}>{fmtDate(client.created_at)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.textFaint} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchClients = useCallback(async (q: string, pg: number, append = false) => {
    if (pg === 1 && !append) setLoading(true);
    else if (pg > 1) setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: pg.toString(), limit: '20', search: q });
      const res = await api.get<{ data: Client[]; meta: { totalPages: number; total: number } }>(
        `/api/agent/clients?${params}`
      );
      setClients(prev => append ? [...prev, ...res.data] : res.data);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch { } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); fetchClients(search, 1); }, 320);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search, fetchClients]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.pageTitle}>Klien</Text>
            <Text style={styles.pageCount}>{total.toLocaleString('id-ID')} terdaftar</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
            <Ionicons name="add" size={19} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
          <Ionicons name="search-outline" size={15} color={Colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Cari nama, agen, agensi…"
            placeholderTextColor={Colors.textFaint}
            returnKeyType="search"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color={Colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.textMuted} />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={item => item.client_id}
          renderItem={({ item, index }) => (
            <ClientRow
              client={item}
              onPress={() => router.push(`/clients/${item.client_id}`)}
              last={index === clients.length - 1}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
            clients.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={28} color={Colors.textFaint} />
              </View>
              <Text style={styles.emptyTitle}>
                {search ? 'Tidak ditemukan' : 'Belum ada klien'}
              </Text>
              <Text style={styles.emptySub}>
                {search ? `Tidak ada hasil untuk "${search}"` : 'Klien yang didaftarkan akan muncul di sini'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); setPage(1); fetchClients(search, 1); }}
              tintColor={Colors.textMuted}
            />
          }
          onEndReached={() => {
            if (loadingMore || page >= totalPages) return;
            const next = page + 1; setPage(next);
            fetchClients(search, next, true);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator style={{ marginVertical: 20 }} color={Colors.textMuted} />
              : null
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
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingTop: 14,
  },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  pageCount: { fontSize: FontSize.sm, color: Colors.textFaint, marginTop: 2 },
  addBtn: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.text,
    alignItems: 'center', justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.borderMid,
    borderRadius: Radius.md, paddingHorizontal: 12, height: 40,
    backgroundColor: Colors.bgSubtle,
  },
  searchRowFocused: { borderColor: Colors.text, backgroundColor: Colors.bg },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 0 },
  listEmpty: { flex: 1 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  rowLast: { borderBottomWidth: 0 },

  avatar: {
    width: 40, height: 40, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: FontSize.md, fontWeight: '800' },

  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textFaint },

  rowRight: { alignItems: 'flex-end', gap: 4 },
  polisTag: {
    backgroundColor: Colors.accentBg,
    borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2,
  },
  polisTagText: { fontSize: FontSize.xxs, fontWeight: '700', color: Colors.accent },
  rowDate: { fontSize: FontSize.xxs, color: Colors.textFaint },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: Radius.full,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySub: { fontSize: FontSize.sm, color: Colors.textFaint, textAlign: 'center', lineHeight: 20 },
});
