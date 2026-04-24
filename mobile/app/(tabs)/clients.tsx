import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

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

const AVATAR_COLORS = [
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#ffe4e6', text: '#9f1239' },
];

function avatarColor(name: string) {
  const sum = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function ClientCard({ client, onPress }: { client: Client; onPress: () => void }) {
  const av = avatarColor(client.full_name);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: av.bg }]}>
        <Text style={[styles.avatarText, { color: av.text }]}>
          {client.full_name[0]?.toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.clientName} numberOfLines={1}>{client.full_name}</Text>
        <Text style={styles.clientMeta} numberOfLines={1}>
          {client.agent_name ?? '—'} · {client.agency_name ?? '—'}
        </Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark-outline" size={11} color={Colors.accent} />
            <Text style={[styles.badgeText, { color: Colors.accent }]}>{client.total_policies} polis</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="document-text-outline" size={11} color="#b45309" />
            <Text style={[styles.badgeText, { color: '#b45309' }]}>{client.total_claims} klaim</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>
        {search ? 'Klien tidak ditemukan' : 'Belum ada klien'}
      </Text>
      <Text style={styles.emptySub}>
        {search ? `Tidak ada hasil untuk "${search}"` : 'Klien yang Anda daftarkan akan muncul di sini'}
      </Text>
    </View>
  );
}

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchClients = useCallback(async (q: string, pg: number, append = false) => {
    if (pg === 1) !append && setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: pg.toString(), limit: '20', search: q });
      const res = await api.get<{ data: Client[]; meta: { totalPages: number } }>(
        `/api/agent/clients?${params}`
      );
      setClients(prev => append ? [...prev, ...res.data] : res.data);
      setTotalPages(res.meta.totalPages);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(1);
      fetchClients(search, 1);
    }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search, fetchClients]);

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    const next = page + 1;
    setPage(next);
    fetchClients(search, next, true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Klien</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama, agen, agensi…"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={item => item.client_id}
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onPress={() => router.push(`/clients/${item.client_id}`)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
            clients.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={<EmptyState search={search} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); setPage(1); fetchClients(search, 1); }}
              tintColor={Colors.accent}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.accent} />
              : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  addBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  searchWrap: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: Radius.lg,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.lg, gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadow.sm,
  },
  avatar: {
    width: 44, height: 44, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: '800' },
  clientName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  clientMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 6 },
  badges: { flexDirection: 'row', gap: 6 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyIcon: {
    width: 72, height: 72, borderRadius: Radius.xl,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
});
