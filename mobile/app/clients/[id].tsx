import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

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
  ACTIVE:   { label: 'Aktif',       color: Colors.success, bg: Colors.successBg },
  INACTIVE: { label: 'Tidak Aktif', color: Colors.danger,  bg: Colors.dangerBg },
  PENDING:  { label: 'Menunggu',   color: Colors.warning, bg: Colors.warningBg },
  EXPIRED:  { label: 'Kadaluarsa', color: Colors.textMuted, bg: Colors.border },
};

function avatarColor(name: string) {
  const sum = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return Colors.avatars[sum % Colors.avatars.length];
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function InfoRow({
  icon, label, value, last,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null; last?: boolean }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Ionicons name={icon} size={15} color={Colors.textFaint} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function PolicyRow({ policy, last }: { policy: Policy; last?: boolean }) {
  const cfg = POLICY_STATUS[policy.status] ?? POLICY_STATUS['PENDING'];
  return (
    <View style={[styles.policyRow, last && styles.policyRowLast]}>
      <View style={styles.policyLeft}>
        <View style={styles.policyTop}>
          <Text style={styles.policyNum}>{policy.policy_number}</Text>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.productName} numberOfLines={1}>{policy.product_name}</Text>
        <Text style={styles.policyDates}>
          {fmtDate(policy.start_date).replace(' ', '\u00A0')} – {fmtDate(policy.end_date).replace(' ', '\u00A0')}
        </Text>
      </View>
      <Text style={styles.premium}>{fmtCurrency(policy.premium_amount)}<Text style={styles.perMonth}>/bln</Text></Text>
    </View>
  );
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
        <ActivityIndicator color={Colors.textMuted} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.loader}>
        <Ionicons name="alert-circle-outline" size={36} color={Colors.textFaint} />
        <Text style={styles.errText}>Data tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const av = avatarColor(client.full_name);
  const initials = client.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const clientStatus = POLICY_STATUS[client.status] ?? { label: client.status, color: Colors.textMuted, bg: Colors.border };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Custom header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{client.full_name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity hero — flat on white */}
        <View style={styles.identityBlock}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>{initials}</Text>
          </View>
          <Text style={styles.clientName}>{client.full_name}</Text>
          <Text style={styles.clientSub}>
            {client.agent_name ?? '—'}
            {client.agency_name ? ` · ${client.agency_name}` : ''}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{client.total_policies}</Text>
              <Text style={styles.statLabel}>Polis</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{client.total_claims}</Text>
              <Text style={styles.statLabel}>Klaim</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: clientStatus.color }]}>
                {clientStatus.label}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Info section */}
        <Text style={styles.sectionTitle}>Informasi Klien</Text>
        <InfoRow icon="mail-outline"     label="Email"          value={client.email} />
        <InfoRow icon="call-outline"     label="Telepon"        value={client.phone} />
        <InfoRow icon="card-outline"     label="NIK"            value={client.nik} />
        <InfoRow icon="calendar-outline" label="Tanggal Lahir"  value={fmtDate(client.birth_date)} />
        <InfoRow
          icon="person-outline"
          label="Jenis Kelamin"
          value={client.gender === 'M' ? 'Laki-laki' : client.gender === 'F' ? 'Perempuan' : null}
        />
        <InfoRow icon="time-outline"     label="Bergabung"      value={fmtDate(client.created_at)} last />

        {(client.policies?.length ?? 0) > 0 && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>
              Polis ({client.policies.length})
            </Text>
            {client.policies.map((p, i) => (
              <PolicyRow
                key={p.contract_id}
                policy={p}
                last={i === client.policies.length - 1}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errText: { fontSize: FontSize.md, color: Colors.textFaint },
  backBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.borderMid, borderRadius: Radius.md,
  },
  backBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.bgSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  identityBlock: {
    alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl, paddingBottom: Spacing.xl,
  },
  avatar: {
    width: 68, height: 68, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: '800' },
  clientName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 4 },
  clientSub: { fontSize: FontSize.sm, color: Colors.textFaint, textAlign: 'center', marginBottom: Spacing.xl },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl,
    overflow: 'hidden', width: '100%',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  statLabel: { fontSize: FontSize.xxs, color: Colors.textFaint, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  divider: { height: 8, backgroundColor: Colors.bgSubtle, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },

  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textFaint,
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: Spacing.lg, paddingTop: 20, paddingBottom: 6,
  },

  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: FontSize.xxs, color: Colors.textFaint, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  infoValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },

  policyRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12,
  },
  policyRowLast: { borderBottomWidth: 0 },
  policyLeft: { flex: 1, minWidth: 0 },
  policyTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  policyNum: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  statusPill: { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: FontSize.xxs, fontWeight: '700' },
  productName: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 3 },
  policyDates: { fontSize: FontSize.xxs, color: Colors.textFaint },
  premium: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.accent, flexShrink: 0 },
  perMonth: { fontSize: FontSize.xs, fontWeight: '400', color: Colors.textFaint },
});
