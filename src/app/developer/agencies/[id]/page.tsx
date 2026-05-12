"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Building2, Pencil, Save, Users, ShieldCheck, Clock, FileText, Check, Copy, UserCog, UserCheck, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useBusy } from "@/components/ui/busy-overlay-provider";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface AgencyDetail {
    agency_id: string;
    name: string;
    address: string | null;
    slug: string | null;
    created_at: string;
}

interface AgencyStats {
    agents: number;
    admins: number;
    total_claims: number;
    pending_claims: number;
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className={cn("text-sm font-semibold text-black", accent)}>{value}</p>
        </div>
    );
}

function DetailRow({ label, value, mono = false, onCopy }: { label: string; value: string; mono?: boolean; onCopy?: () => void }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        if (!onCopy) return;
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0 px-4">
            <span className="text-xs font-medium text-gray-500 shrink-0 w-32">{label}</span>
            <span className={cn("text-sm text-black text-right break-all", mono && "font-mono text-xs text-gray-600")}>{value}</span>
            {onCopy && (
                <button onClick={handleCopy} className="shrink-0 p-1.5 rounded-md hover:bg-gray-100 transition-colors">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                </button>
            )}
        </div>
    );
}

export default function DeveloperAgencyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { run } = useBusy();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detailData, setDetailData] = useState<{ agency: AgencyDetail; stats: AgencyStats } | null>(null);
    
    // Edit state
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", address: "" });
    const [editError, setEditError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAgencyDetail = async () => {
            if (!params.id) return;
            try {
                const res = await fetch(`/api/developer/agencies/${params.id}`);
                const data = await res.json();
                if (res.ok) {
                    setDetailData(data);
                    setEditForm({ name: data.agency.name ?? "", address: data.agency.address ?? "" });
                } else {
                    setError(data.error || "Gagal memuat data agensi.");
                }
            } catch (e) {
                console.error("Failed to fetch agency details", e);
                setError("Terjadi kesalahan koneksi.");
            } finally {
                setLoading(false);
            }
        };
        fetchAgencyDetail();
    }, [params.id]);

    const saveEdit = async () => {
        if (!detailData) return;
        setEditError(null);
        await run(async () => {
            const res = await fetch(`/api/developer/agencies/${detailData.agency.agency_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editForm.name, address: editForm.address }),
            });
            const json = await res.json();
            if (!res.ok) { setEditError(json.error || "Gagal menyimpan."); return; }
            setEditMode(false);
            setDetailData(prev => prev ? {
                ...prev,
                agency: { ...prev.agency, name: editForm.name.trim().toUpperCase(), address: editForm.address.trim() || null }
            } : null);
            toast({ title: "Berhasil", description: "Perubahan disimpan" });
        }, "Menyimpan…");
    };

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
    }

    if (error || !detailData) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold text-red-600">{error || "Agensi tidak ditemukan"}</h2>
                <p className="text-sm text-gray-500">ID: {params.id}</p>
                <Button onClick={() => router.back()}>Kembali</Button>
            </div>
        );
    }

    const { agency, stats } = detailData;

    return (
        <PageShell>
            <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full max-w-6xl mx-auto pb-16">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-4 min-w-0">
                        <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-md shrink-0 h-10 w-10">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-white text-emerald-700 border-emerald-200">
                                    Aktif
                                </span>
                                <span className="text-xs text-gray-400 font-medium">
                                    Terdaftar {new Date(agency.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black truncate">{agency.name}</h1>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none p-0 h-auto space-x-6">
                        <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Profil Agensi</TabsTrigger>
                        <TabsTrigger value="metrics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Performa & Metrik</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-6 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
                            {/* Profile Header Card */}
                            <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-xl bg-black flex items-center justify-center text-white shadow-sm shrink-0">
                                        <Building2 className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-black text-xl">Identitas Agensi</h3>
                                        <p className="text-sm text-gray-500 mt-0.5">Informasi dan detail sistem</p>
                                    </div>
                                </div>
                                {!editMode && (
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 shrink-0"
                                    >
                                        <Pencil className="h-4 w-4" /> Edit Profil
                                    </button>
                                )}
                            </div>

                            {editMode ? (
                                <div className="p-8 space-y-5 bg-gray-50/30">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Agensi *</label>
                                        <input
                                            value={editForm.name}
                                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value.toUpperCase() }))}
                                            className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 uppercase tracking-wide transition-all bg-white"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Alamat Lengkap</label>
                                        <input
                                            value={editForm.address}
                                            onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                                            className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all bg-white"
                                        />
                                    </div>
                                    {editError && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{editError}</p>}
                                    
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={() => { setEditMode(false); setEditError(null); setEditForm({ name: agency.name ?? "", address: agency.address ?? "" }); }}
                                            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            onClick={saveEdit}
                                            disabled={!editForm.name.trim()}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-40 transition-all shadow-md"
                                        >
                                            <Save className="h-4 w-4" /> Simpan Perubahan
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-8">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Informasi Dasar</h4>
                                            <div className="space-y-6">
                                                <Stat label="Nama Agensi" value={agency.name} accent="text-base" />
                                                <Stat label="Alamat Domisili" value={agency.address || "—"} accent="leading-relaxed" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Informasi Sistem</h4>
                                            <div className="border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                                                <DetailRow label="ID Agensi" value={agency.agency_id} mono onCopy={() => {}} />
                                                <DetailRow label="Slug URL" value={agency.slug || "—"} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="metrics" className="mt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Agen Aktif</p>
                                </div>
                                <p className="text-4xl font-black text-black tabular-nums">{stats.agents.toLocaleString()}</p>
                            </div>
                            
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                        <UserCog className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Admin Pengelola</p>
                                </div>
                                <p className="text-4xl font-black text-black tabular-nums">{stats.admins.toLocaleString()}</p>
                            </div>
                            
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Klaim</p>
                                </div>
                                <p className="text-4xl font-black text-black tabular-nums">{stats.total_claims.toLocaleString()}</p>
                            </div>
                            
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Klaim Tertunda</p>
                                </div>
                                <p className="text-4xl font-black text-black tabular-nums">{stats.pending_claims.toLocaleString()}</p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </PageShell>
    );
}
