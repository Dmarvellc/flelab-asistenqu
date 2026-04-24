import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Policy {
  contract_id: string;
  policy_number: string;
  product_name: string;
  status: string;
  premium_amount: number;
  start_date: string;
  end_date: string;
}

interface ClientDetail {
  client_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  nik?: string;
  birth_date?: string;
  gender?: string;
  status: string;
  created_at: string;
  agent_name: string | null;
  agency_name: string | null;
  total_policies: number;
  total_claims: number;
  policies: Policy[];
}

const POLICY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:   { label: 'Aktif',     color: '#065f46', bg: '#d1fae5' },
  INACTIVE: { label: 'Tidak Aktif', color: '#9f1239', bg: '#ffe4e6' },
  PENDING:  { label: 'Menunggu', color: '#92400e', bg: '#fef3c7' },
  EXPIRED:  { label: 'Kadaluarsa', color: '#374151', bg: '#f3f4f6' },
};

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={14} color={Colors.accent} />
      </View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function PolicyCard({ policy }: { policy: Policy }) {
  const cfg = POLICY_STATUS[policy.status] ?? POLICY_STATUS['PENDING'];
  return (
    <View style={[styles.policyCard, Shadow.sm]}>
      <View style={styles.policyTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.policyNum}>{policy.policy_number}</Text>
          <Text style={styles.productName} numberOfLines={1}>{policy.product_name}</Text>
        </View>
        <View style={[styles.policyStatus, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.policyStatusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <View style={styles.policyBottom}>
        <Text style={styles.premium}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(policy.premium_amount ?? 0)}/bln
        </Text>
        <Text style={styles.policyDate}>
          {new Date(policy.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          {' – '}
          {new Date(policy.end_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ClientDetail>(`/api/agent/clients/${id}`)
      .then(setClient)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.loader}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errText}>Data tidak ditemukan</Text>
      </View>
    );
  }

  const initials = client.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const av = ['#ede9fe', '#7c3aed'];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.hero}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroInitials}>{initials}</Text>
        </View>
        <Text style={styles.heroName}>{client.full_name}</Text>
        <Text style={styles.heroSub}>{client.agent_name ?? '—'} · {client.agency_name ?? '—'}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{client.total_policies}</Text>
            <Text style={styles.heroStatLabel}>Polis</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{client.total_claims}</Text>
            <Text style={styles.heroStatLabel}>Klaim</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { color: client.status === 'ACTIVE' ? '#34d399' : '#f87171' }]}>
              {client.status === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif'}
            </Text>
            <Text style={styles.heroStatLabel}>Status</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Klien</Text>
        <View style={[styles.card, Shadow.sm]}>
          <InfoRow icon="mail-outline"     label="Email"          value={client.email} />
          <InfoRow icon="call-outline"     label="Telepon"        value={client.phone} />
          <InfoRow icon="card-outline"     label="NIK"            value={client.nik} />
          <InfoRow icon="calendar-outline" label="Tanggal Lahir"  value={client.birth_date ? new Date(client.birth_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : undefined} />
          <InfoRow icon="person-outline"   label="Jenis Kelamin"  value={client.gender === 'M' ? 'Laki-laki' : client.gender === 'F' ? 'Perempuan' : undefined} />
          <InfoRow icon="time-outline"     label="Bergabung"      value={new Date(client.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} />
        </View>
      </View>

      {/* Policies */}
      {(client.policies?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Polis ({client.policies.length})</Text>
          <View style={{ gap: 10 }}>
            {client.policies.map(p => <PolicyCard key={p.contract_id} policy={p} />)}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errText: { fontSize: FontSize.md, color: Colors.textMuted },

  hero: {
    alignItems: 'center', paddingBottom: Spacing.xl, paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  heroAvatar: {
    width: 72, height: 72, borderRadius: Radius.full,
    backgroundColor: 'rgba(99,102,241,0.3)',
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.5)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroInitials: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.accentLight },
  heroName: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 4, marginBottom: Spacing.lg },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  heroStat: { alignItems: 'center' },
  heroStatVal: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  heroStatLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },

  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },

  card: { backgroundColor: Colors.card, borderRadius: Radius.lg, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoIconWrap: {
    width: 30, height: 30, borderRadius: Radius.md,
    backgroundColor: 'rgba(99,102,241,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 1 },
  infoValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },

  policyCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md },
  policyTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 10,
  },
  policyNum: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  productName: { fontSize: FontSize.xs, color: Colors.textMuted, maxWidth: 180 },
  policyStatus: {
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  policyStatusText: { fontSize: 10, fontWeight: '700' },
  policyBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  premium: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.accent },
  policyDate: { fontSize: FontSize.xs, color: Colors.textMuted },
});
