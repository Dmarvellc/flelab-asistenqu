"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Calendar,
    Plus,
    Clock,
    Building2,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Search,
    Filter,
    CalendarCheck,
    FileText,
    ArrowRight,
    Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion } from "motion/react";

type Appointment = {
    appointment_id: string;
    appointment_date: string;
    appointment_time: string | null;
    appointment_type: string;
    status: string;
    notes: string | null;
    hospital_notes: string | null;
    client_name: string;
    hospital_name: string | null;
    doctor_name: string | null;
    claim_number: string | null;
    claim_id?: string | null;
};

type Client = { client_id: string; full_name: string };
type Hospital = { hospital_id: string; name: string };

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    SCHEDULED: {
        label: "Terjadwal",
        icon: <Clock className="h-3.5 w-3.5" />,
        className: "bg-blue-50 text-blue-700 border border-blue-200",
    },
    CONFIRMED: {
        label: "Dikonfirmasi",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        className: "bg-green-50 text-green-700 border border-green-200",
    },
    COMPLETED: {
        label: "Selesai",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        className: "bg-gray-100 text-gray-600 border border-gray-200",
    },
    CANCELLED: {
        label: "Dibatalkan",
        icon: <XCircle className="h-3.5 w-3.5" />,
        className: "bg-red-50 text-red-600 border border-red-200",
    },
    RESCHEDULED: {
        label: "Dijadwal Ulang",
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        className: "bg-orange-50 text-orange-700 border border-orange-200",
    },
};

const typeLabels: Record<string, string> = {
    CONSULTATION: "Konsultasi",
    FOLLOW_UP: "Kontrol",
    PROCEDURE: "Tindakan",
    EMERGENCY: "Darurat",
    PRE_HOSPITALIZATION: "Pra Rawat Inap",
    POST_HOSPITALIZATION: "Pasca Rawat Inap",
    VISIT_LOG: "Notif Kunjungan",
};

export default function AppointmentsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [converting, setConverting] = useState<string | null>(null);

    // Regular appointment form
    const [clients, setClients] = useState<Client[]>([]);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [form, setForm] = useState({
        client_id: "",
        hospital_id: "",
        appointment_date: new Date().toISOString().split("T")[0],
        appointment_time: "09:00",
        appointment_type: "CONSULTATION",
        notes: "",
    });

    // Visit LOG form
    const [logForm, setLogForm] = useState({
        client_id: "",
        hospital_id: "",
        appointment_date: new Date().toISOString().split("T")[0],
        appointment_time: "",
        notes: "",
    });

    useEffect(() => {
        fetchAppointments();
        fetchFormData();
    }, []);

    const fetchAppointments = async () => {
        try {
            const res = await fetch("/api/agent/appointments");
            if (res.ok) {
                const data = await res.json();
                setAppointments(data.appointments || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchFormData = async () => {
        const [clientsRes, hospitalsRes] = await Promise.all([
            fetch("/api/agent/clients"),
            fetch("/api/hospitals"),
        ]);
        if (clientsRes.ok) {
            const d = await clientsRes.json();
            setClients(d.clients || []);
        }
        if (hospitalsRes.ok) {
            const d = await hospitalsRes.json();
            setHospitals(d.hospitals || []);
        }
    };

    const handleCreate = async () => {
        if (!form.client_id || !form.appointment_date) {
            toast({ title: "Data kurang", description: "Pilih klien dan tanggal.", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/agent/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                const data = await res.json();
                setAppointments(prev => [data.appointment, ...prev]);
                setIsDialogOpen(false);
                toast({ title: "Berhasil", description: "Jadwal berhasil dibuat." });
                setForm({
                    client_id: "", hospital_id: "",
                    appointment_date: new Date().toISOString().split("T")[0],
                    appointment_time: "09:00",
                    appointment_type: "CONSULTATION",
                    notes: "",
                });
            } else {
                const err = await res.json();
                toast({ title: "Gagal", description: err.error, variant: "destructive" });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateLog = async () => {
        if (!logForm.client_id || !logForm.hospital_id || !logForm.appointment_date || !logForm.notes.trim()) {
            toast({ title: "Data kurang", description: "Klien, rumah sakit, tanggal, dan keluhan wajib diisi.", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/agent/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...logForm,
                    appointment_type: "VISIT_LOG",
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setAppointments(prev => [data.appointment, ...prev]);
                setIsLogDialogOpen(false);
                toast({ title: "LOG terkirim", description: "Rumah sakit akan menerima notifikasi kunjungan ini." });
                setLogForm({
                    client_id: "", hospital_id: "",
                    appointment_date: new Date().toISOString().split("T")[0],
                    appointment_time: "",
                    notes: "",
                });
            } else {
                const err = await res.json();
                toast({ title: "Gagal", description: err.error, variant: "destructive" });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        const res = await fetch(`/api/agent/appointments/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (res.ok) {
            setAppointments(prev => prev.map(a => a.appointment_id === id ? { ...a, status } : a));
            toast({ title: "Status diperbarui" });
        }
    };

    const handleConvert = async (id: string) => {
        setConverting(id);
        try {
            const res = await fetch(`/api/agent/appointments/${id}/convert`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast({ title: "Berhasil dikonversi", description: "LOG berhasil diubah menjadi klaim. Melanjutkan ke form klaim..." });
                setAppointments(prev => prev.map(a =>
                    a.appointment_id === id ? { ...a, status: "COMPLETED", claim_id: data.claim_id } : a
                ));
                setTimeout(() => router.push(`/agent/claims/${data.claim_id}`), 800);
            } else {
                toast({ title: "Gagal", description: data.error, variant: "destructive" });
            }
        } finally {
            setConverting(null);
        }
    };

    const filtered = appointments.filter(a => {
        const matchSearch =
            a.client_name?.toLowerCase().includes(search.toLowerCase()) ||
            a.hospital_name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || a.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const today = new Date().toISOString().split("T")[0];
    const upcoming = filtered.filter(a => a.appointment_date >= today && !["COMPLETED", "CANCELLED"].includes(a.status));
    const past = filtered.filter(a => a.appointment_date < today || ["COMPLETED", "CANCELLED"].includes(a.status));

    return (
        <div className="flex flex-col gap-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                        <CalendarCheck className="h-3 w-3" />
                        <span>Jadwal & Visit LOG</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Jadwal Dokter</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Booking jadwal dan kirim notifikasi kunjungan ke rumah sakit.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setIsLogDialogOpen(true)}
                        variant="outline"
                        className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                        <FileText className="h-4 w-4" />
                        Buat Visit LOG
                    </Button>
                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-black hover:bg-gray-900 text-white gap-2 shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Buat Jadwal
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: appointments.length },
                    { label: "Terjadwal", value: appointments.filter(a => a.status === "SCHEDULED").length },
                    { label: "Dikonfirmasi", value: appointments.filter(a => a.status === "CONFIRMED").length },
                    { label: "Visit LOG", value: appointments.filter(a => a.appointment_type === "VISIT_LOG").length },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300">
                        <p className="text-4xl font-bold tabular-nums text-gray-900 tracking-tight">{stat.value}</p>
                        <p className="text-[15px] font-medium text-gray-500 mt-2">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-8 border-b border-gray-50 bg-gray-50/30">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari nasabah atau RS..."
                            className="pl-10 bg-gray-50 border-gray-100 text-sm rounded-xl focus:bg-white"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1.5 flex-wrap items-center">
                        <Filter className="h-3.5 w-3.5 text-gray-400 mr-1" />
                        {[null, "SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"].map(s => (
                            <button
                                key={s ?? "all"}
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    "text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150",
                                    statusFilter === s ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                {s ? (statusConfig[s]?.label ?? s) : "Semua"}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                        <p className="text-sm text-gray-400">Memuat jadwal...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-gray-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-gray-900 mb-2">Belum ada jadwal</p>
                            <p className="text-base text-gray-500">Buat jadwal atau Visit LOG untuk nasabah Anda</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {upcoming.length > 0 && (
                            <div>
                                <div className="px-8 py-4 bg-gray-50/50">
                                    <p className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">Mendatang ({upcoming.length})</p>
                                </div>
                                {upcoming.map((apt, i) => (
                                    <AppointmentRow
                                        key={apt.appointment_id}
                                        apt={apt}
                                        onStatusChange={updateStatus}
                                        onConvert={handleConvert}
                                        converting={converting}
                                        index={i}
                                    />
                                ))}
                            </div>
                        )}
                        {past.length > 0 && (
                            <div>
                                <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-50">
                                    <p className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">Riwayat ({past.length})</p>
                                </div>
                                {past.map((apt, i) => (
                                    <AppointmentRow
                                        key={apt.appointment_id}
                                        apt={apt}
                                        onStatusChange={updateStatus}
                                        onConvert={handleConvert}
                                        converting={converting}
                                        index={i}
                                        isPast
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Regular Appointment Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarCheck className="h-5 w-5" />
                            Buat Jadwal Baru
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nasabah *</Label>
                            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Pilih nasabah..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => (
                                        <SelectItem key={c.client_id} value={c.client_id}>{c.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rumah Sakit</Label>
                            <Select value={form.hospital_id} onValueChange={v => setForm({ ...form, hospital_id: v })}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Pilih rumah sakit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {hospitals.map(h => (
                                        <SelectItem key={h.hospital_id} value={h.hospital_id}>{h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal *</Label>
                                <Input type="date" value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu</Label>
                                <Input type="time" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis Jadwal</Label>
                            <Select value={form.appointment_type} onValueChange={v => setForm({ ...form, appointment_type: v })}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(typeLabels).filter(([v]) => v !== "VISIT_LOG").map(([val, label]) => (
                                        <SelectItem key={val} value={val}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan</Label>
                            <Textarea placeholder="Catatan tambahan..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="rounded-xl resize-none" rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleCreate} disabled={submitting} className="bg-black text-white hover:bg-gray-900">
                            {submitting ? "Menyimpan..." : "Buat Jadwal"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Visit LOG Dialog */}
            <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Buat Visit LOG
                        </DialogTitle>
                    </DialogHeader>
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mb-2">
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Visit LOG adalah notifikasi ke rumah sakit bahwa Anda akan mengirim pasien. Jika pasien perlu rawat inap, LOG ini bisa langsung dikonversi ke klaim.
                        </p>
                    </div>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nasabah *</Label>
                            <Select value={logForm.client_id} onValueChange={v => setLogForm({ ...logForm, client_id: v })}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Pilih nasabah..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => (
                                        <SelectItem key={c.client_id} value={c.client_id}>{c.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rumah Sakit *</Label>
                            <Select value={logForm.hospital_id} onValueChange={v => setLogForm({ ...logForm, hospital_id: v })}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Pilih rumah sakit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {hospitals.map(h => (
                                        <SelectItem key={h.hospital_id} value={h.hospital_id}>{h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Kunjungan *</Label>
                                <Input type="date" value={logForm.appointment_date} onChange={e => setLogForm({ ...logForm, appointment_date: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perkiraan Waktu</Label>
                                <Input type="time" value={logForm.appointment_time} onChange={e => setLogForm({ ...logForm, appointment_time: e.target.value })} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keluhan / Kondisi Pasien *</Label>
                            <Textarea
                                placeholder="Contoh: Demam tinggi 3 hari, nyeri dada, sesak napas. Kemungkinan perlu rawat inap..."
                                value={logForm.notes}
                                onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                                className="rounded-xl resize-none"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLogDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleCreateLog} disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
                            {submitting ? "Mengirim..." : "Kirim LOG ke RS"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function AppointmentRow({
    apt,
    onStatusChange,
    onConvert,
    converting,
    index,
    isPast = false,
}: {
    apt: Appointment;
    onStatusChange: (id: string, status: string) => void;
    onConvert: (id: string) => void;
    converting: string | null;
    index: number;
    isPast?: boolean;
}) {
    const cfg = statusConfig[apt.status] ?? { label: apt.status, icon: null, className: "bg-gray-100 text-gray-600" };
    const aptDate = new Date(apt.appointment_date);
    const isVisitLog = apt.appointment_type === "VISIT_LOG";
    const canConvert = isVisitLog && apt.status === "CONFIRMED" && !apt.claim_id;

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-6 p-6 sm:px-8 bg-white border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors",
                isPast && "opacity-70 grayscale-[20%]",
                isVisitLog && !isPast && "border-l-2 border-l-blue-300"
            )}
        >
            {/* Date Block */}
            <div className="flex-shrink-0 w-14 text-center">
                <div className={cn(
                    "rounded-xl py-2 px-1",
                    isPast ? "bg-gray-100" : isVisitLog ? "bg-blue-600" : "bg-black"
                )}>
                    <p className={cn("text-xs font-medium", isPast ? "text-gray-500" : "text-white/70")}>
                        {aptDate.toLocaleDateString("id-ID", { month: "short" })}
                    </p>
                    <p className={cn("text-2xl font-bold leading-none mt-0.5", isPast ? "text-gray-600" : "text-white")}>
                        {aptDate.getDate()}
                    </p>
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{apt.client_name}</p>
                    {isVisitLog && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">VISIT LOG</span>
                    )}
                    {apt.claim_number && (
                        <span className="text-xs text-gray-400 font-mono">{apt.claim_number}</span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                    {apt.hospital_name && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="h-3 w-3" /> {apt.hospital_name}
                        </span>
                    )}
                    {apt.appointment_time && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" /> {apt.appointment_time.slice(0, 5)}
                        </span>
                    )}
                    <span className="text-xs text-gray-400">{typeLabels[apt.appointment_type] ?? apt.appointment_type}</span>
                </div>
                {apt.notes && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{isVisitLog ? `Keluhan: ${apt.notes}` : apt.notes}</p>
                )}
                {apt.hospital_notes && (
                    <p className="text-xs text-blue-600 mt-0.5 truncate">RS: {apt.hospital_notes}</p>
                )}
            </div>

            {/* Status + Actions */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", cfg.className)}>
                    {cfg.icon}
                    {cfg.label}
                </span>
                {canConvert && (
                    <Button
                        size="sm"
                        className="text-xs h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        disabled={converting === apt.appointment_id}
                        onClick={() => onConvert(apt.appointment_id)}
                    >
                        {converting === apt.appointment_id ? (
                            <span className="animate-pulse">Memproses...</span>
                        ) : (
                            <>
                                <Stethoscope className="h-3 w-3" />
                                Buat Klaim
                                <ArrowRight className="h-3 w-3" />
                            </>
                        )}
                    </Button>
                )}
                {apt.status === "SCHEDULED" && !isVisitLog && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-3 rounded-lg"
                        onClick={() => onStatusChange(apt.appointment_id, "COMPLETED")}
                    >
                        Selesai
                    </Button>
                )}
                {apt.status === "SCHEDULED" && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-3 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => onStatusChange(apt.appointment_id, "CANCELLED")}
                    >
                        Batal
                    </Button>
                )}
            </div>
        </motion.div>
    );
}
