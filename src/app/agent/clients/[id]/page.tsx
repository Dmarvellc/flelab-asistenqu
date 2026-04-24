"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Loader2, ArrowLeft, User, FileText, Phone, MapPin,
    Calendar, CreditCard, ShieldCheck, Briefcase, Mail, HeartPulse,
    Wallet, Users, Star, AlertTriangle, CheckCircle2, Clock,
    Stethoscope, Globe,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ClientRequestsPanel } from "@/components/client-requests/requests-panel";

type ClientDetail = {
    client_id: string;
    full_name: string;
    phone_number: string;
    address: string;
    birth_date: string;
    gender: string;
    id_card: string;
    passport_number?: string | null;
    email?: string;
    occupation?: string;
    marital_status?: string;
    status: string;
    created_at: string;
};

type Beneficiary = { beneficiary_id: string; full_name: string; relationship: string; percentage: string; nik?: string };
type Rider = { rider_id: string; rider_name: string; coverage: string };
type Insured = { full_name: string; nik?: string; birth_date?: string; gender?: string; relationship?: string };

type Contract = {
    contract_id: string;
    contract_number: string;
    contract_product: string;
    contract_startdate: string;
    contract_duedate: string;
    status: string;
    policy_url?: string;
    insurance_company_name?: string;
    policy_type?: string;
    policy_status?: string;
    underwriting_status?: string;
    issue_date?: string;
    next_due_date?: string;
    due_day?: number;
    grace_period_days?: number;
    reinstatement_period?: number;
    policy_term_years?: number;
    premium_payment_term?: number;
    currency?: string;
    sum_insured?: string;
    payment_type?: string;
    premium_amount?: string;
    premium_frequency?: string;
    coverage_area?: string;
    room_plan?: string;
    annual_limit?: string;
    lifetime_limit?: string;
    deductible?: string;
    coinsurance_pct?: string;
    waiting_period_days?: number;
    pre_existing_covered?: string;
    cashless_network?: string;
    benefit_life?: string;
    benefit_accidental_death?: string;
    benefit_disability?: string;
    benefit_critical?: string;
    benefit_hospitalization?: string;
    benefit_icu?: string;
    benefit_surgery?: string;
    benefit_outpatient?: string;
    benefit_daily_cash?: string;
    benefit_maternity?: string;
    benefit_dental?: string;
    benefit_optical?: string;
    benefit_ambulance?: string;
    benefit_medical_checkup?: string;
    payment_method?: string;
    bank_name?: string;
    account_number?: string;
    account_holder_name?: string;
    card_expiry?: string;
    card_network?: string;
    virtual_account_number?: string;
    autodebet_start_date?: string;
    autodebet_end_date?: string;
    autodebet_mandate_ref?: string;
    billing_cycle_day?: number;
    beneficiaries?: Beneficiary[];
    riders?: Rider[];
    insured?: Insured | null;
};

/* ─── Helpers ─────────────────────────────────────────────── */
const idr = (v?: string | number | null) => {
    const n = typeof v === "number" ? v : parseFloat(v || "0");
    return isNaN(n) || n === 0 ? "—" : "Rp " + n.toLocaleString("id-ID");
};
const date = (v?: string) => v ? new Date(v).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" }) : "—";
const daysBetween = (d: string) => {
    const diff = new Date(d).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
};
const freqLabel: Record<string, string> = { MONTHLY:"Bulanan", QUARTERLY:"Triwulanan", SEMESTERLY:"Semesteran", YEARLY:"Tahunan" };
const payLabel: Record<string, string> = {
    TRANSFER:"Transfer Manual",
    AUTODEBET_REKENING:"Autodebet Rekening",
    AUTODEBET_KK:"Autodebet Kartu Kredit",
    VIRTUAL_ACCOUNT:"Virtual Account",
};
const statusStyle = (s?: string) => {
    const map: Record<string, string> = {
        AKTIF:   "bg-emerald-50 text-emerald-700 border-emerald-200",
        ACTIVE:  "bg-emerald-50 text-emerald-700 border-emerald-200",
        LAPSE:   "bg-red-50 text-red-700 border-red-200",
        PAID_UP: "bg-blue-50 text-blue-700 border-blue-200",
        SURRENDERED: "bg-gray-100 text-gray-600 border-gray-200",
        MATURED: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return map[s || "AKTIF"] || "bg-gray-50 text-gray-600 border-gray-200";
};

/* ─── Small presentational components ─────────────────────── */
function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
            <p className={cn("text-sm font-semibold text-gray-900", accent)}>{value}</p>
        </div>
    );
}

function BenefitItem({ label, value, icon: Icon }: { label: string; value?: string; icon: React.ElementType }) {
    if (!value || parseFloat(value) === 0) return null;
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-100">
            <div className="h-8 w-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{idr(value)}</p>
            </div>
        </div>
    );
}

/* ─── Due Countdown Badge ─────────────────────────────────── */
function DueCountdown({ contract }: { contract: Contract }) {
    if (!contract.next_due_date) return null;
    const d = daysBetween(contract.next_due_date);
    const grace = contract.grace_period_days || 30;
    let tone = "bg-emerald-50 text-emerald-700 border-emerald-200";
    let label = `${d} hari lagi`;
    let Icon = Clock;
    if (d < 0) {
        tone = d < -grace ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200";
        label = `Lewat ${Math.abs(d)} hari${d < -grace ? " • LAPSE" : " • Tenggang"}`;
        Icon = AlertTriangle;
    } else if (d <= 7) {
        tone = "bg-amber-50 text-amber-700 border-amber-200";
        Icon = AlertTriangle;
    }
    return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border", tone)}>
            <Icon className="w-3 h-3" /> {label}
        </div>
    );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [client, setClient] = useState<ClientDetail | null>(null);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [latestClaim, setLatestClaim] = useState<{ claim_id: string; hospital_id: string; status: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeContractId, setActiveContractId] = useState<string | null>(null);

    useEffect(() => {
        const fetchClientDetail = async () => {
            if (!params.id) return;
            try {
                const res = await fetch(`/api/agent/clients/${params.id}`);
                const data = await res.json();
                if (res.ok) {
                    setClient(data.client);
                    setContracts(data.contracts || []);
                    setActiveContractId(data.contracts?.[0]?.contract_id ?? null);
                    setLatestClaim(data.latestClaim ?? null);
                }
            } catch (e) {
                console.error("Failed to fetch client details", e);
            } finally {
                setLoading(false);
            }
        };
        fetchClientDetail();
    }, [params.id]);

    const activeContract = useMemo(
        () => contracts.find(c => c.contract_id === activeContractId) ?? contracts[0],
        [contracts, activeContractId]
    );

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold">Klien tidak ditemukan</h2>
                <Button onClick={() => router.back()}>Kembali</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-16">
            {/* ── Header ──────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full bg-gray-50 hover:bg-gray-100 h-10 w-10 shrink-0">
                        <ArrowLeft className="h-4 w-4 text-gray-600" />
                    </Button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border", statusStyle(client.status))}>
                                {client.status === "ACTIVE" ? "Aktif" : client.status}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                                Bergabung {new Date(client.created_at).toLocaleDateString("id-ID", { month:"long", year:"numeric" })}
                            </span>
                            <span className="text-xs text-gray-500 font-semibold">{contracts.length} polis terdaftar</span>
                        </div>
                        <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-900 mt-1">{client.full_name}</h2>
                    </div>
                </div>
                <Button onClick={() => router.push("/agent/clients/new")} className="gap-2 rounded-xl bg-gray-900 hover:bg-black text-white">
                    <FileText className="w-4 h-4" /> Tambah Polis Baru
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* ── Profil Nasabah ────────────── */}
                <div className="lg:col-span-1 h-fit bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <h3 className="font-semibold text-gray-900 text-base flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" /> Profil Nasabah
                        </h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <Stat label="NIK" value={client.id_card || "—"} />
                            <Stat label="Nomor Paspor" value={client.passport_number || "—"} />
                            <Stat label="JK" value={<span className="capitalize">{client.gender?.toLowerCase().replace("_"," ") || "—"}</span>} />
                            <Stat label="Lahir" value={date(client.birth_date)} />
                            <Stat label="Status" value={<span className="capitalize">{client.marital_status?.toLowerCase().replace("_"," ") || "—"}</span>} />
                        </div>
                        <Separator className="bg-gray-100" />
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Phone className="w-3.5 h-3.5 text-gray-400 mt-1 shrink-0" />
                                <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Telepon</p><p className="text-sm text-gray-900 font-medium">{client.phone_number || "—"}</p></div>
                            </div>
                            {client.email && (
                                <div className="flex items-start gap-3">
                                    <Mail className="w-3.5 h-3.5 text-gray-400 mt-1 shrink-0" />
                                    <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email</p><p className="text-sm text-gray-900 font-medium break-all">{client.email}</p></div>
                                </div>
                            )}
                            {client.occupation && (
                                <div className="flex items-start gap-3">
                                    <Briefcase className="w-3.5 h-3.5 text-gray-400 mt-1 shrink-0" />
                                    <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Pekerjaan</p><p className="text-sm text-gray-900 font-medium">{client.occupation}</p></div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-1 shrink-0" />
                                <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Domisili</p><p className="text-sm text-gray-900 leading-relaxed">{client.address || "—"}</p></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Polis Detail ─────────────── */}
                <div className="lg:col-span-2 space-y-5">
                    {contracts.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-gray-100 py-16 text-center">
                            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                            <p className="font-bold text-gray-900">Belum ada polis</p>
                            <p className="text-sm text-gray-500 mt-1">Tambahkan polis pertama untuk nasabah ini.</p>
                        </div>
                    ) : (
                        <>
                            {/* Policy tabs if multiple */}
                            {contracts.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {contracts.map(c => (
                                        <button
                                            key={c.contract_id}
                                            onClick={() => setActiveContractId(c.contract_id)}
                                            className={cn(
                                                "shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                                                c.contract_id === activeContract?.contract_id
                                                    ? "bg-gray-900 text-white border-gray-900"
                                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            {c.contract_product}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeContract && <PolicyCard contract={activeContract} />}
                        </>
                    )}
                </div>
            </div>

            {/* ── Permintaan RS ─────────────── */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm p-6">
                {latestClaim?.hospital_id ? (
                    <ClientRequestsPanel
                        mode="agent"
                        clientId={client.client_id}
                        hospitalId={latestClaim.hospital_id}
                        claimId={latestClaim.claim_id}
                    />
                ) : (
                    <div className="text-sm text-gray-500">
                        <p className="font-semibold text-gray-900 mb-1">Permintaan ke Rumah Sakit</p>
                        <p>Klien belum punya klaim aktif — buat klaim dulu agar bisa mengajukan permintaan ke rumah sakit.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Policy Card ────────────────────────────────────────── */
function PolicyCard({ contract }: { contract: Contract }) {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50/50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h4 className="text-xl font-bold text-gray-900 tracking-tight">{contract.contract_product}</h4>
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", statusStyle(contract.policy_status))}>
                                {contract.policy_status || contract.status}
                            </span>
                            <DueCountdown contract={contract} />
                        </div>
                        <p className="text-[13px] text-gray-500">
                            <span className="font-mono">{contract.contract_number}</span>
                            {contract.insurance_company_name && <> • {contract.insurance_company_name}</>}
                        </p>
                    </div>
                    {contract.policy_url && (
                        <a href={contract.policy_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-2 rounded-xl shrink-0">
                                <FileText className="h-4 w-4" /> Dokumen Polis
                            </Button>
                        </a>
                    )}
                </div>

                {/* Key facts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                    <Stat label="UP / Jiwa" value={<span className="text-emerald-600">{idr(contract.sum_insured)}</span>} />
                    <Stat label="Premi" value={<span>{idr(contract.premium_amount)} <span className="text-[10px] text-gray-400">/ {freqLabel[contract.premium_frequency || "MONTHLY"] || "—"}</span></span>} />
                    <Stat label="Mulai" value={date(contract.contract_startdate)} />
                    <Stat label="Berakhir" value={date(contract.contract_duedate)} />
                </div>
            </div>

            {/* Sections */}
            <div className="p-6 space-y-6">
                {/* Jatuh Tempo */}
                <Section title="Jatuh Tempo & Masa Berlaku" icon={Calendar}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Stat label="Terbit" value={date(contract.issue_date)} />
                        <Stat label="Tgl. Jatuh Tempo" value={contract.due_day ? `Tgl. ${contract.due_day}` : "—"} />
                        <Stat label="Jatuh Tempo Berikutnya" value={date(contract.next_due_date)} />
                        <Stat label="Masa Tenggang" value={`${contract.grace_period_days || 0} hari`} />
                        <Stat label="Jangka Polis" value={contract.policy_term_years ? `${contract.policy_term_years} tahun` : "—"} />
                        <Stat label="Masa Bayar Premi" value={contract.premium_payment_term ? `${contract.premium_payment_term} tahun` : "—"} />
                        <Stat label="Underwriting" value={contract.underwriting_status || "—"} />
                        <Stat label="Pemulihan" value={contract.reinstatement_period ? `${contract.reinstatement_period} bulan` : "—"} />
                    </div>
                </Section>

                {/* Cakupan */}
                <Section title="Cakupan Pertanggungan" icon={Globe}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Stat label="Area" value={contract.coverage_area || "—"} />
                        <Stat label="Plan Kamar" value={contract.room_plan || "—"} />
                        <Stat label="Limit Tahunan" value={idr(contract.annual_limit)} />
                        <Stat label="Limit Seumur Hidup" value={idr(contract.lifetime_limit)} />
                        <Stat label="Deductible" value={idr(contract.deductible)} />
                        <Stat label="Co-Insurance" value={contract.coinsurance_pct ? `${contract.coinsurance_pct}%` : "—"} />
                        <Stat label="Masa Tunggu" value={`${contract.waiting_period_days || 0} hari`} />
                        <Stat label="Pre-Existing" value={contract.pre_existing_covered === "YES" ? "Ya" : contract.pre_existing_covered === "AFTER_2_YEARS" ? "Setelah 2th" : "Tidak"} />
                    </div>
                    {contract.cashless_network && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                            <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">Jaringan Cashless:</span>
                            <span className="font-semibold text-gray-900">{contract.cashless_network}</span>
                        </div>
                    )}
                </Section>

                {/* Manfaat */}
                <Section title="Manfaat Polis" icon={HeartPulse}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        <BenefitItem label="Jiwa (UP)" value={contract.benefit_life} icon={ShieldCheck} />
                        <BenefitItem label="Kecelakaan (ADB)" value={contract.benefit_accidental_death} icon={AlertTriangle} />
                        <BenefitItem label="Cacat Tetap Total" value={contract.benefit_disability} icon={AlertTriangle} />
                        <BenefitItem label="Penyakit Kritis" value={contract.benefit_critical} icon={HeartPulse} />
                        <BenefitItem label="Rawat Inap / Hari" value={contract.benefit_hospitalization} icon={Stethoscope} />
                        <BenefitItem label="ICU / Hari" value={contract.benefit_icu} icon={Stethoscope} />
                        <BenefitItem label="Pembedahan" value={contract.benefit_surgery} icon={Stethoscope} />
                        <BenefitItem label="Rawat Jalan" value={contract.benefit_outpatient} icon={Stethoscope} />
                        <BenefitItem label="Santunan Harian" value={contract.benefit_daily_cash} icon={Wallet} />
                        <BenefitItem label="Melahirkan" value={contract.benefit_maternity} icon={HeartPulse} />
                        <BenefitItem label="Gigi" value={contract.benefit_dental} icon={HeartPulse} />
                        <BenefitItem label="Kacamata" value={contract.benefit_optical} icon={HeartPulse} />
                        <BenefitItem label="Ambulance" value={contract.benefit_ambulance} icon={AlertTriangle} />
                        <BenefitItem label="Medical Check-Up" value={contract.benefit_medical_checkup} icon={CheckCircle2} />
                    </div>
                    {contract.riders && contract.riders.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Star className="w-3 h-3" /> Rider Tambahan</p>
                            <div className="space-y-1.5">
                                {contract.riders.map(r => (
                                    <div key={r.rider_id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                                        <span className="font-medium text-gray-900">{r.rider_name}</span>
                                        <span className="text-gray-600">{idr(r.coverage)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Section>

                {/* Pembayaran / Autodebet */}
                <Section title="Metode Pembayaran" icon={Wallet}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Stat label="Metode" value={payLabel[contract.payment_method || ""] || "—"} />
                        <Stat label={contract.payment_method === "AUTODEBET_KK" ? "Penerbit KK" : "Bank"} value={contract.bank_name || "—"} />
                        <Stat
                            label={contract.payment_method === "AUTODEBET_KK" ? "4 Digit Terakhir" : "No. Rekening"}
                            value={contract.account_number ? <span className="font-mono">{"••••" + contract.account_number.slice(-4)}</span> : "—"}
                        />
                        <Stat label="Pemilik" value={contract.account_holder_name || "—"} />
                        {contract.card_network && <Stat label="Jaringan Kartu" value={contract.card_network} />}
                        {contract.card_expiry && <Stat label="Exp Kartu" value={<span className="font-mono">{contract.card_expiry}</span>} />}
                        {contract.autodebet_start_date && <Stat label="Autodebet Mulai" value={date(contract.autodebet_start_date)} />}
                        {contract.autodebet_end_date && (
                            <Stat
                                label="Exp Autodebet"
                                value={<span className={daysBetween(contract.autodebet_end_date) < 30 ? "text-amber-600" : ""}>{date(contract.autodebet_end_date)}</span>}
                            />
                        )}
                        {contract.autodebet_mandate_ref && <Stat label="Ref. Mandat" value={<span className="font-mono text-xs">{contract.autodebet_mandate_ref}</span>} />}
                        {contract.billing_cycle_day && <Stat label="Tgl. Tagih" value={`Tgl. ${contract.billing_cycle_day}`} />}
                        {contract.virtual_account_number && <Stat label="No. VA" value={<span className="font-mono">{contract.virtual_account_number}</span>} />}
                    </div>
                </Section>

                {/* Ahli Waris */}
                {contract.beneficiaries && contract.beneficiaries.length > 0 && (
                    <Section title="Ahli Waris / Penerima Manfaat" icon={Users}>
                        <div className="space-y-2">
                            {contract.beneficiaries.map(b => (
                                <div key={b.beneficiary_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{b.full_name}</p>
                                        <p className="text-xs text-gray-500 capitalize">{b.relationship?.toLowerCase().replace("_", " ")}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{parseFloat(b.percentage || "0")}%</p>
                                        {b.nik && <p className="text-[10px] text-gray-400 font-mono">{b.nik}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Tertanggung Berbeda */}
                {contract.insured && (
                    <Section title="Tertanggung (Beda dari Pemegang Polis)" icon={ShieldCheck}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Stat label="Nama" value={contract.insured.full_name} />
                            <Stat label="NIK" value={contract.insured.nik || "—"} />
                            <Stat label="Lahir" value={date(contract.insured.birth_date)} />
                            <Stat label="Hubungan" value={<span className="capitalize">{contract.insured.relationship?.toLowerCase().replace("_"," ")}</span>} />
                        </div>
                    </Section>
                )}
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div>
            <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" /> {title}
            </h5>
            {children}
        </div>
    );
}
