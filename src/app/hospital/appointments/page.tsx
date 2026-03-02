"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Calendar,
    Clock,
    User,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Search,
    Filter,
    CalendarCheck,
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
    doctor_name: string | null;
    claim_number: string | null;
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    SCHEDULED: {
        label: "Menunggu Konfirmasi",
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
};

export default function HospitalAppointmentsPage() {
    const { toast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    // Modal state
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
    const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
    const [hospitalNotes, setHospitalNotes] = useState("");
    const [newDate, setNewDate] = useState("");
    const [newTime, setNewTime] = useState("");

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const res = await fetch("/api/hospital/appointments");
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

    const updateAppointment = async (id: string, updates: any) => {
        const res = await fetch(`/api/hospital/appointments/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        });
        if (res.ok) {
            const { appointment } = await res.json();
            setAppointments(prev => prev.map(a => a.appointment_id === id ? { ...a, ...appointment } : a));
            toast({ title: "Berhasil", description: "Jadwal berhasil diperbarui." });
        } else {
            toast({ title: "Gagal", description: "Gagal memperbarui jadwal.", variant: "destructive" });
        }
    };

    const handleConfirm = (id: string) => {
        updateAppointment(id, { status: "CONFIRMED" });
    };

    const handleReject = () => {
        if (!selectedApt) return;
        updateAppointment(selectedApt.appointment_id, { status: "CANCELLED", hospital_notes: hospitalNotes });
        setRejectDialogOpen(false);
        setHospitalNotes("");
        setSelectedApt(null);
    };

    const handleReschedule = () => {
        if (!selectedApt || !newDate) return;
        updateAppointment(selectedApt.appointment_id, {
            status: "RESCHEDULED",
            appointment_date: newDate,
            appointment_time: newTime,
            hospital_notes: hospitalNotes,
        });
        setRescheduleDialogOpen(false);
        setHospitalNotes("");
        setNewDate("");
        setNewTime("");
        setSelectedApt(null);
    };

    const openRejectDialog = (apt: Appointment) => {
        setSelectedApt(apt);
        setHospitalNotes("");
        setRejectDialogOpen(true);
    };

    const openRescheduleDialog = (apt: Appointment) => {
        setSelectedApt(apt);
        setNewDate(apt.appointment_date);
        setNewTime(apt.appointment_time || "");
        setHospitalNotes("");
        setRescheduleDialogOpen(true);
    };

    const filtered = appointments.filter(a => {
        const matchSearch =
            a.client_name?.toLowerCase().includes(search.toLowerCase()) ||
            a.doctor_name?.toLowerCase().includes(search.toLowerCase());
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
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Jadwal Pasien</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Kelola permintaan janji temu dari agen asuransi.
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-8 border-b border-gray-50 bg-gray-50/30">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari pasien atau dokter..."
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
                            <p className="text-base text-gray-500 max-w-sm mx-auto leading-relaxed">Tidak ada permintaan janji temu saat ini.</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {/* Upcoming */}
                        {upcoming.length > 0 && (
                            <div>
                                <div className="px-8 py-4 bg-gray-50/50">
                                    <p className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">Mendatang & Menunggu ({upcoming.length})</p>
                                </div>
                                {upcoming.map((apt, i) => (
                                    <AppointmentRow
                                        key={apt.appointment_id} apt={apt} index={i}
                                        onConfirm={() => handleConfirm(apt.appointment_id)}
                                        onReject={() => openRejectDialog(apt)}
                                        onReschedule={() => openRescheduleDialog(apt)}
                                    />
                                ))}
                            </div>
                        )}
                        {/* Past */}
                        {past.length > 0 && (
                            <div>
                                <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-50">
                                    <p className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">Riwayat ({past.length})</p>
                                </div>
                                {past.map((apt, i) => (
                                    <AppointmentRow key={apt.appointment_id} apt={apt} index={i} isPast />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tolak Jadwal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-500">Anda akan menolak janji temu untuk <strong>{selectedApt?.client_name}</strong>. Silakan masukkan alasannya.</p>
                        <div className="space-y-2">
                            <Label>Alasan Penolakan</Label>
                            <Textarea
                                placeholder="Misalnya: Dokter tidak tersedia pada tanggal tersebut..."
                                value={hospitalNotes}
                                onChange={(e) => setHospitalNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Batal</Button>
                        <Button variant="destructive" onClick={handleReject}>Tolak Jadwal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reschedule Dialog */}
            <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Jadwalkan Ulang</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-500">Ubah tanggal dan waktu janji temu untuk <strong>{selectedApt?.client_name}</strong>.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tanggal Baru *</Label>
                                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Waktu Baru</Label>
                                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Catatan (Opsional)</Label>
                            <Textarea
                                placeholder="Misalnya: Dialihkan ke jadwal pagi..."
                                value={hospitalNotes}
                                onChange={(e) => setHospitalNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleReschedule} className="bg-black text-white hover:bg-gray-900" disabled={!newDate}>Simpan Jadwal Baru</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function AppointmentRow({
    apt,
    index,
    isPast = false,
    onConfirm,
    onReject,
    onReschedule,
}: {
    apt: Appointment;
    index: number;
    isPast?: boolean;
    onConfirm?: () => void;
    onReject?: () => void;
    onReschedule?: () => void;
}) {
    const cfg = statusConfig[apt.status] ?? { label: apt.status, icon: null, className: "bg-gray-100 text-gray-600" };
    const aptDate = new Date(apt.appointment_date);

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-6 p-6 sm:px-8 bg-white border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors",
                isPast && "opacity-70 grayscale-[20%]"
            )}
        >
            {/* Date Block */}
            <div className="flex-shrink-0 w-14 text-center">
                <div className={cn(
                    "rounded-xl py-2 px-1",
                    isPast ? "bg-gray-100" : "bg-black"
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
                    {apt.claim_number && (
                        <span className="text-xs text-gray-400 font-mono">{apt.claim_number}</span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                    {apt.appointment_time && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" /> {apt.appointment_time.slice(0, 5)}
                        </span>
                    )}
                    <span className="text-xs text-gray-400">{typeLabels[apt.appointment_type] ?? apt.appointment_type}</span>
                </div>
                {apt.notes && (
                    <p className="text-xs text-gray-400 mt-1">Agen: {apt.notes}</p>
                )}
                {apt.hospital_notes && (
                    <p className="text-xs text-blue-600 mt-0.5">RS: {apt.hospital_notes}</p>
                )}
            </div>

            {/* Status + Actions */}
            <div className="flex flex-col items-end gap-2">
                <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", cfg.className)}>
                    {cfg.icon}
                    {cfg.label}
                </span>
                
                {/* Actions only for SCHEMA / RESCHEDULED status if not past */}
                {!isPast && (apt.status === "SCHEDULED" || apt.status === "RESCHEDULED") && (
                    <div className="flex items-center gap-2 mt-2">
                        {onReschedule && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={onReschedule}>
                                Jadwal Ulang
                            </Button>
                        )}
                        {onReject && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={onReject}>
                                Tolak
                            </Button>
                        )}
                        {onConfirm && (
                            <Button size="sm" className="h-7 text-xs px-3 bg-black hover:bg-gray-800 text-white" onClick={onConfirm}>
                                Konfirmasi
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
