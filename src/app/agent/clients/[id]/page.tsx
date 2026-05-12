"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Loader2, ArrowLeft, User, FileText, Phone, MapPin,
    Calendar, CreditCard, ShieldCheck, Briefcase, Mail, HeartPulse,
    Wallet, Users, Star, AlertTriangle, CheckCircle2, Clock,
    Stethoscope, Globe, Building2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ClientRequestsPanel } from "@/components/client-requests/requests-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    agent_name?: string | null;
    agency_name?: string | null;
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
        AKTIF:   "bg-white text-emerald-700 border-emerald-200",
        ACTIVE:  "bg-white text-emerald-700 border-emerald-200",
        LAPSE:   "bg-red-50 text-red-700 border-red-200",
        PAID_UP: "bg-white text-blue-700 border-blue-200",
        SURRENDERED: "bg-gray-100 text-gray-600 border-gray-200",
        MATURED: "bg-white text-amber-700 border-amber-200",
    };
    return map[s || "AKTIF"] || "bg-gray-50 text-gray-600 border-gray-200";
};

/* ─── Small presentational components ─────────────────────── */
function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400">{label}</p>
            <p className={cn("text-sm font-semibold text-black", accent)}>{value}</p>
        </div>
    );
}

function BenefitItem({ label, value, icon: Icon }: { label: string; value?: string; icon: React.ElementType }) {
    if (!value || parseFloat(value) === 0) return null;
    return (
        <div className="flex items-center gap-3 p-3 rounded-md bg-white border border-gray-200">
            <div className="h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
                <p className="text-sm font-semibold text-black truncate">{idr(value)}</p>
            </div>
        </div>
    );
}

/* ─── Due Countdown Badge ─────────────────────────────────── */
function DueCountdown({ contract }: { contract: Contract }) {
    if (!contract.next_due_date) return null;
    const d = daysBetween(contract.next_due_date);
    const grace = contract.grace_period_days || 30;
    let tone = "bg-white text-emerald-700 border-emerald-200";
    let label = `${d} hari lagi`;
    let Icon = Clock;
    if (d < 0) {
        tone = d < -grace ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-amber-700 border-amber-200";
        label = `Lewat ${Math.abs(d)} hari${d < -grace ? " • LAPSE" : " • Tenggang"}`;
        Icon = AlertTriangle;
    } else if (d <= 7) {
        tone = "bg-white text-amber-700 border-amber-200";
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
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full max-w-6xl mx-auto pb-16">
            {/* ── Header ──────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-4 min-w-0">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-md shrink-0 h-10 w-10">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", statusStyle(client.status))}>
                                {client.status === "ACTIVE" ? "Aktif" : client.status}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                                Bergabung {new Date(client.created_at).toLocaleDateString("id-ID", { month:"long", year:"numeric" })}
                            </span>
                            <span className="text-xs text-gray-500 font-semibold">{contracts.length} polis terdaftar</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">{client.full_name}</h1>
                    </div>
                </div>
                <Button onClick={() => router.push("/agent/clients/new")} className="gap-2 rounded-md bg-black hover:bg-black text-white">
                    <FileText className="w-4 h-4" /> Tambah Polis Baru
                </Button>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none p-0 h-auto space-x-6">
                    <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Profile & Info</TabsTrigger>
                    <TabsTrigger value="policies" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Policies</TabsTrigger>
                    <TabsTrigger value="requests" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Requests</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-6">
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 w-full">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="h-12 w-12 rounded-lg bg-black flex items-center justify-center text-white shadow-sm">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-black text-xl">Profil Klien</h3>
                                <p className="text-sm text-gray-500">Informasi identitas lengkap</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8">
                            <Stat label="NIK / No. Identitas" value={client.id_card || "—"} />
                            <Stat label="Email" value={client.email || "—"} />
                            <Stat label="No. Telepon" value={client.phone_number || "—"} />
                            <Stat label="Tanggal Lahir" value={date(client.birth_date)} />
                            
                            <Stat label="Jenis Kelamin" value={client.gender === "MALE" ? "Laki-laki" : client.gender === "FEMALE" ? "Perempuan" : "—"} />
                            <Stat label="Pekerjaan" value={client.occupation || "—"} />
                            <Stat label="Status Pernikahan" value={client.marital_status || "—"} />
                            <Stat label="Agensi" value={client.agency_name || "—"} />
                        </div>

                        <Separator className="my-10 bg-gray-100" />
                        
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Alamat Domisili</h3>
                            <p className="text-sm font-medium text-black leading-relaxed max-w-4xl">{client.address || "—"}</p>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="policies" className="mt-8">
                    <div className="space-y-8">
                        {/* Policy Selector */}
                        <div className="flex gap-6 overflow-x-auto border-b border-gray-200 w-full pb-1">
                            {contracts.map(c => {
                                const isActive = c.contract_id === activeContractId;
                                return (
                                    <button
                                        key={c.contract_id}
                                        onClick={() => setActiveContractId(c.contract_id)}
                                        className={cn(
                                            "shrink-0 px-2 py-3 text-sm font-semibold border-b-2 transition-all",
                                            isActive
                                                ? "border-black text-black"
                                                : "border-transparent text-gray-500 hover:text-black hover:border-gray-300"
                                        )}
                                    >
                                        {c.contract_product || c.contract_number}
                                    </button>
                                );
                            })}
                            {contracts.length === 0 && (
                                <div className="w-full py-8 text-left">
                                    <p className="text-sm text-gray-500">Belum ada polis terdaftar untuk klien ini.</p>
                                </div>
                            )}
                        </div>

                        {activeContract && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {/* Policy Header */}
                                <div className="relative">
                                    <div className="absolute top-0 right-0">
                                        <DueCountdown contract={activeContract} />
                                    </div>
                                    
                                    <div className="flex items-center gap-3 mb-3">
                                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Polis Aktif</span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-black mb-2">{activeContract.contract_product}</h2>
                                    <p className="text-sm text-gray-500 font-medium mb-10">{activeContract.insurance_company_name}</p>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                                        <Stat label="Uang Pertanggungan" value={idr(activeContract.sum_insured)} accent="text-black text-base" />
                                        <Stat label="Premi" value={`${idr(activeContract.premium_amount)} / ${freqLabel[activeContract.premium_frequency || ""] || activeContract.premium_frequency}`} accent="text-base" />
                                        <Stat label="Metode Bayar" value={payLabel[activeContract.payment_method || ""] || activeContract.payment_method} accent="text-base" />
                                        <Stat label="Jatuh Tempo" value={date(activeContract.next_due_date)} accent="text-base" />
                                    </div>
                                </div>

                                <Separator className="bg-gray-100" />

                                {/* Benefits */}
                                <div className="grid sm:grid-cols-2 gap-10">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 mb-5 uppercase tracking-wider flex items-center gap-2">
                                            <HeartPulse className="w-4 h-4" /> Manfaat Utama
                                        </h3>
                                        <div className="space-y-4">
                                            <BenefitItem label="Jiwa" value={activeContract.benefit_life} icon={Star} />
                                            <BenefitItem label="Kecelakaan" value={activeContract.benefit_accidental_death} icon={AlertTriangle} />
                                            <BenefitItem label="Cacat" value={activeContract.benefit_disability} icon={User} />
                                            <BenefitItem label="Penyakit Kritis" value={activeContract.benefit_critical} icon={HeartPulse} />
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 mb-5 uppercase tracking-wider flex items-center gap-2">
                                            <Building2 className="w-4 h-4" /> Rawat Inap
                                        </h3>
                                        <div className="space-y-4">
                                            <BenefitItem label="Kamar" value={activeContract.room_plan} icon={Building2} />
                                            <BenefitItem label="Limit Tahunan" value={activeContract.annual_limit} icon={Wallet} />
                                            <BenefitItem label="Limit Seumur Hidup" value={activeContract.lifetime_limit} icon={Globe} />
                                            <BenefitItem label="ICU" value={activeContract.benefit_icu} icon={Clock} />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-gray-100" />

                                {/* Additional Info */}
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Detail Tambahan
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-6">
                                        <Stat label="Masa Tunggu" value={`${activeContract.waiting_period_days || 0} Hari`} />
                                        <Stat label="Pre-existing" value={activeContract.pre_existing_covered || "—"} />
                                        <Stat label="Cashless" value={activeContract.cashless_network || "—"} />
                                        <Stat label="Area Cover" value={activeContract.coverage_area || "—"} />
                                        <Stat label="Deductible" value={idr(activeContract.deductible)} />
                                        <Stat label="Coinsurance" value={activeContract.coinsurance_pct ? `${activeContract.coinsurance_pct}%` : "—"} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="requests" className="mt-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full">
                        {latestClaim?.hospital_id ? (
                            <ClientRequestsPanel
                                mode="agent"
                                clientId={client.client_id}
                                hospitalId={latestClaim.hospital_id}
                                claimId={latestClaim.claim_id}
                            />
                        ) : (
                            <div className="text-sm text-gray-500">
                                <h3 className="text-lg font-semibold text-black mb-2">Permintaan Klien</h3>
                                <p>Klien belum memiliki riwayat klaim aktif. Buat klaim terlebih dahulu untuk mulai mengajukan permintaan data ke rumah sakit.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
