"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, FileText, User, ShieldCheck, Loader2, ArrowRight, ArrowLeft, Building2, Stethoscope, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import { motion, AnimatePresence } from "motion/react";


// --- Types ---
type Step = {
    id: number;
    title: string;
    description: string;
    icon: React.ElementType;
};

type Client = {
    client_id: string;
    full_name: string;
};

type Hospital = {
    hospital_id: string;
    name: string;
};

type Disease = {
    disease_id: string;
    name: string;
    icd10_code?: string;
};

const steps: Step[] = [
    { id: 1, title: "Pilih Nasabah", description: "Data Pasien", icon: User },
    { id: 2, title: "Detail Medis", description: "RS & Diagnosa", icon: Stethoscope },
    { id: 3, title: "Konfirmasi", description: "Review & Submit", icon: ShieldCheck },
];

function Combobox({
    items,
    value,
    onChange,
    placeholder,
    searchPlaceholder,
    emptyText,
    hasError = false,
}: {
    items: { id: string; label: string }[],
    value: string,
    onChange: (id: string) => void,
    placeholder: string,
    searchPlaceholder: string,
    emptyText: string,
    hasError?: boolean
}) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between",
                        !value && "text-muted-foreground",
                        hasError && "border-red-500"
                    )}
                >
                    {value
                        ? items.find((item) => item.id === value)?.label
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.label}
                                    onSelect={() => {
                                        onChange(item.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export default function NewClaimPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Data Sources
    const [clients, setClients] = useState<Client[]>([]);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [diseases, setDiseases] = useState<Disease[]>([]);

    // Form Data
    const [formData, setFormData] = useState({
        client_id: "",
        hospital_id: "",
        disease_id: "",
        claim_date: new Date().toISOString().split('T')[0],
        total_amount: "",
        notes: "",
        claim_category: "MANFAAT_HIDUP",
        benefit_type: "",
        care_cause: "",
        symptom_onset_date: "",
        previous_treatment: "",
        doctor_hospital_history: "",
        accident_chronology: "",
        alcohol_drug_related: "",
        death_datetime: "",
        death_place: "",
        beneficiary_notes: "",
    });

    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
    const fieldLabelMap: Record<string, string> = {
        client_id: "Nama Nasabah",
        hospital_id: "Rumah Sakit",
        disease_id: "Penyakit / Diagnosa",
        claim_date: "Tanggal Kejadian / Masuk RS",
        benefit_type: "Jenis Manfaat",
        care_cause: "Penyebab Perawatan / Meninggal",
        symptom_onset_date: "Tanggal awal keluhan / gejala",
        previous_treatment: "Riwayat perawatan/penyakit sebelumnya",
        doctor_hospital_history: "Nama/alamat dokter atau rumah sakit",
        alcohol_drug_related: "Pengaruh alkohol / narkotika / obat lain",
        death_datetime: "Tanggal & jam meninggal",
        death_place: "Tempat meninggal",
    };

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientsRes, hospitalsRes, diseasesRes] = await Promise.all([
                    fetch("/api/agent/clients"),
                    fetch("/api/hospitals"),
                    fetch("/api/diseases"),
                ]);

                if (clientsRes.ok) {
                    const data = await clientsRes.json();
                    setClients(data.clients || []);
                }
                if (hospitalsRes.ok) {
                    const data = await hospitalsRes.json();
                    setHospitals(data.hospitals || []);
                }
                if (diseasesRes.ok) {
                    const data = await diseasesRes.json();
                    setDiseases(data.diseases || []);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
                toast({
                    title: "Gagal Memuat Data",
                    description: "Terjadi kesalahan saat memuat data referensi.",
                    variant: "destructive"
                });
            }
        };
        fetchData();
    }, [toast]);

    const validateStep = (step: number) => {
        const newErrors: Record<string, boolean> = {};
        let isValid = true;

        if (step === 1) {
            if (!formData.client_id) {
                newErrors.client_id = true;
                isValid = false;
            }
        }
        if (step === 2) {
            if (!formData.hospital_id) { newErrors.hospital_id = true; isValid = false; }
            if (!formData.disease_id) { newErrors.disease_id = true; isValid = false; }
            if (!formData.claim_date) { newErrors.claim_date = true; isValid = false; }
            if (!formData.benefit_type) { newErrors.benefit_type = true; isValid = false; }
            if (!formData.care_cause) { newErrors.care_cause = true; isValid = false; }
            if (!formData.symptom_onset_date) { newErrors.symptom_onset_date = true; isValid = false; }
            if (!formData.previous_treatment) { newErrors.previous_treatment = true; isValid = false; }
            if (!formData.doctor_hospital_history) { newErrors.doctor_hospital_history = true; isValid = false; }
            if (!formData.alcohol_drug_related) { newErrors.alcohol_drug_related = true; isValid = false; }
            if (formData.claim_category === "MENINGGAL_DUNIA") {
                if (!formData.death_datetime) { newErrors.death_datetime = true; isValid = false; }
                if (!formData.death_place) { newErrors.death_place = true; isValid = false; }
            }
        }

        setFieldErrors(newErrors);

        if (!isValid) {
            const missingFields = Object.keys(newErrors).map((key) => fieldLabelMap[key] || key);
            toast({
                title: "Data Belum Lengkap",
                description: `Mohon lengkapi: ${missingFields.join(", ")}.`,
                variant: "destructive"
            });
        }
        return isValid;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
        }
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/agent/claims", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: formData.client_id,
                    hospital_id: formData.hospital_id,
                    disease_id: formData.disease_id,
                    claim_date: formData.claim_date,
                    total_amount: formData.total_amount,
                    notes: formData.notes,
                    claim_meta: {
                        claim_category: formData.claim_category,
                        benefit_type: formData.benefit_type,
                        care_cause: formData.care_cause,
                        symptom_onset_date: formData.symptom_onset_date,
                        previous_treatment: formData.previous_treatment,
                        doctor_hospital_history: formData.doctor_hospital_history,
                        accident_chronology: formData.accident_chronology,
                        alcohol_drug_related: formData.alcohol_drug_related,
                        death_datetime: formData.death_datetime,
                        death_place: formData.death_place,
                        beneficiary_notes: formData.beneficiary_notes,
                    },
                }),
            });

            if (res.ok) {
                toast({ title: "Berhasil", description: "Klaim berhasil dibuat (Draft)." });
                router.push("/agent/claims");
            } else {
                toast({
                    title: "Gagal Membuat Klaim",
                    description: "Terjadi kesalahan saat menyimpan data.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error submitting claim", error);
            toast({
                title: "Kesalahan Sistem",
                description: "Gagal menghubungi server.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 20 : -20,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 20 : -20,
            opacity: 0,
        }),
    };

    const getClientName = () => clients.find(c => c.client_id === formData.client_id)?.full_name || "-";
    const getHospitalName = () => hospitals.find(h => h.hospital_id === formData.hospital_id)?.name || "-";
    const getDiseaseName = () => diseases.find(d => d.disease_id === formData.disease_id)?.name || "-";

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-1">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Buat Klaim Baru</h1>
                <p className="text-muted-foreground mt-1">
                    Ajukan klaim asuransi untuk nasabah Anda.
                </p>
            </div>

            {/* Stepper */}
            <div className="relative mb-12">
                <div className="absolute top-5 left-0 w-full h-[1px] bg-border -z-10" />
                <div className="flex justify-between w-full">
                    {steps.map((step) => {
                        const isActive = step.id === currentStep;
                        const isCompleted = step.id < currentStep;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 px-4">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        backgroundColor: isActive || isCompleted ? "#000" : "#fff",
                                        borderColor: isActive || isCompleted ? "#000" : "#e5e7eb",
                                        color: isActive || isCompleted ? "#fff" : "#6b7280",
                                        scale: isActive ? 1.1 : 1,
                                    }}
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border transition-colors duration-300 shadow-sm",
                                    )}
                                >
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </motion.div>
                                <div className="text-center hidden sm:block">
                                    <p className={cn("text-sm font-medium transition-colors", isActive ? "text-foreground" : "text-muted-foreground")}>{step.title}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden min-h-[400px] p-1">
                <AnimatePresence mode="wait" custom={currentStep}>
                    <motion.div
                        key={currentStep}
                        custom={currentStep}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="w-full"
                    >
                        {/* Step 1: Select Client */}
                        {currentStep === 1 && (
                            <div className="space-y-6 max-w-xl mx-auto">
                                <div className="text-center mb-8">
                                    <h3 className="text-xl font-semibold">Pilih Nasabah</h3>
                                    <p className="text-muted-foreground">Pilih nasabah yang akan mengajukan klaim.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nama Nasabah</Label>
                                        <Combobox
                                            items={clients.map(c => ({ id: c.client_id, label: c.full_name }))}
                                            value={formData.client_id}
                                            onChange={(val) => {
                                                setFormData({ ...formData, client_id: val });
                                                if (fieldErrors.client_id) setFieldErrors({ ...fieldErrors, client_id: false });
                                            }}
                                            placeholder="Pilih Nasabah"
                                            searchPlaceholder="Cari nasabah..."
                                            emptyText="Nasabah tidak ditemukan."
                                            hasError={fieldErrors.client_id}
                                        />
                                        {fieldErrors.client_id && <p className="text-xs text-red-500">Nasabah harus dipilih.</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Medical Details */}
                        {currentStep === 2 && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-semibold flex items-center gap-2">
                                            <Building2 className="w-5 h-5" /> Fasilitas Kesehatan
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Rumah Sakit</Label>
                                                <Combobox
                                                    items={hospitals.map(h => ({ id: h.hospital_id, label: h.name }))}
                                                    value={formData.hospital_id}
                                                    onChange={(val) => {
                                                        setFormData({ ...formData, hospital_id: val });
                                                        if (fieldErrors.hospital_id) setFieldErrors({ ...fieldErrors, hospital_id: false });
                                                    }}
                                                    placeholder="Pilih Rumah Sakit"
                                                    searchPlaceholder="Cari rumah sakit..."
                                                    emptyText="Rumah sakit tidak ditemukan."
                                                    hasError={fieldErrors.hospital_id}
                                                />
                                                {fieldErrors.hospital_id && <p className="text-xs text-red-500">Rumah sakit harus dipilih.</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tanggal Kejadian / Masuk RS</Label>
                                                <Input
                                                    type="date"
                                                    value={formData.claim_date}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, claim_date: e.target.value });
                                                        if (fieldErrors.claim_date) setFieldErrors({ ...fieldErrors, claim_date: false });
                                                    }}
                                                    className={cn("bg-transparent", fieldErrors.claim_date && "border-red-500")}
                                                />
                                                {fieldErrors.claim_date && <p className="text-xs text-red-500">Tanggal kejadian wajib diisi.</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Kategori Klaim</Label>
                                                <Select
                                                    value={formData.claim_category}
                                                    onValueChange={(val) => setFormData({ ...formData, claim_category: val as "MANFAAT_HIDUP" | "MENINGGAL_DUNIA" })}
                                                >
                                                    <SelectTrigger className="bg-transparent">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MANFAAT_HIDUP">Manfaat Hidup</SelectItem>
                                                        <SelectItem value="MENINGGAL_DUNIA">Meninggal Dunia</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-xl font-semibold flex items-center gap-2">
                                            <Stethoscope className="w-5 h-5" /> Diagnosa & Biaya
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Penyakit / Diagnosa</Label>
                                                <Combobox
                                                    items={diseases.map(d => ({ id: d.disease_id, label: d.name }))}
                                                    value={formData.disease_id}
                                                    onChange={(val) => {
                                                        setFormData({ ...formData, disease_id: val });
                                                        if (fieldErrors.disease_id) setFieldErrors({ ...fieldErrors, disease_id: false });
                                                    }}
                                                    placeholder="Pilih Penyakit"
                                                    searchPlaceholder="Cari penyakit..."
                                                    emptyText="Penyakit tidak ditemukan."
                                                    hasError={fieldErrors.disease_id}
                                                />
                                                {fieldErrors.disease_id && <p className="text-xs text-red-500">Diagnosa harus dipilih.</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Perkiraan Biaya (IDR)</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={formData.total_amount}
                                                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                                                    className="bg-transparent"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Jenis Manfaat</Label>
                                                <Select
                                                    value={formData.benefit_type}
                                                    onValueChange={(val) => {
                                                        setFormData({ ...formData, benefit_type: val });
                                                        if (fieldErrors.benefit_type) setFieldErrors({ ...fieldErrors, benefit_type: false });
                                                    }}
                                                >
                                                    <SelectTrigger className={cn("bg-transparent", fieldErrors.benefit_type && "border-red-500")}>
                                                        <SelectValue placeholder="Pilih jenis manfaat" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {formData.claim_category === "MANFAAT_HIDUP" ? (
                                                            <>
                                                                <SelectItem value="KESEHATAN">Kesehatan</SelectItem>
                                                                <SelectItem value="CACAT_TETAP_TOTAL">Cacat Tetap & Total</SelectItem>
                                                                <SelectItem value="CACAT_KARENA_KECELAKAAN">Cacat karena Kecelakaan</SelectItem>
                                                                <SelectItem value="KONDISI_KRITIS">Kondisi Kritis</SelectItem>
                                                                <SelectItem value="PEMBEBASAN_PREMI">Pembebasan Pembayaran Premi</SelectItem>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <SelectItem value="MENINGGAL_DUNIA">Meninggal Dunia</SelectItem>
                                                                <SelectItem value="MENINGGAL_KECELAKAAN">Meninggal karena Kecelakaan</SelectItem>
                                                                <SelectItem value="PEMBEBASAN_PREMI_MENINGGAL">Pembebasan Premi Meninggal Dunia</SelectItem>
                                                            </>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {fieldErrors.benefit_type && <p className="text-xs text-red-500">Jenis manfaat wajib dipilih.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-4 space-y-4">
                                    <h4 className="font-semibold">Informasi Pendukung Klaim</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Penyebab Perawatan / Meninggal</Label>
                                            <Select
                                                value={formData.care_cause}
                                                onValueChange={(val) => {
                                                    setFormData({ ...formData, care_cause: val });
                                                    if (fieldErrors.care_cause) setFieldErrors({ ...fieldErrors, care_cause: false });
                                                }}
                                            >
                                                <SelectTrigger className={cn("bg-transparent", fieldErrors.care_cause && "border-red-500")}>
                                                    <SelectValue placeholder="Pilih penyebab" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PENYAKIT">Penyakit</SelectItem>
                                                    <SelectItem value="KECELAKAAN">Kecelakaan</SelectItem>
                                                    <SelectItem value="LAINNYA">Lain-lain</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {fieldErrors.care_cause && <p className="text-xs text-red-500">Penyebab klaim wajib dipilih.</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Tanggal awal keluhan / gejala</Label>
                                            <Input
                                                type="date"
                                                value={formData.symptom_onset_date}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, symptom_onset_date: e.target.value });
                                                    if (fieldErrors.symptom_onset_date) setFieldErrors({ ...fieldErrors, symptom_onset_date: false });
                                                }}
                                                className={cn("bg-transparent", fieldErrors.symptom_onset_date && "border-red-500")}
                                            />
                                            {fieldErrors.symptom_onset_date && <p className="text-xs text-red-500">Tanggal awal gejala wajib diisi.</p>}
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Riwayat perawatan/penyakit sebelumnya</Label>
                                            <Textarea
                                                value={formData.previous_treatment}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, previous_treatment: e.target.value });
                                                    if (fieldErrors.previous_treatment) setFieldErrors({ ...fieldErrors, previous_treatment: false });
                                                }}
                                                className={cn("bg-transparent", fieldErrors.previous_treatment && "border-red-500")}
                                                placeholder="Jelaskan riwayat pengobatan terkait."
                                            />
                                            {fieldErrors.previous_treatment && <p className="text-xs text-red-500">Riwayat perawatan wajib diisi.</p>}
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Nama/alamat dokter atau rumah sakit yang pernah merawat</Label>
                                            <Textarea
                                                value={formData.doctor_hospital_history}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, doctor_hospital_history: e.target.value });
                                                    if (fieldErrors.doctor_hospital_history) setFieldErrors({ ...fieldErrors, doctor_hospital_history: false });
                                                }}
                                                className={cn("bg-transparent", fieldErrors.doctor_hospital_history && "border-red-500")}
                                                placeholder="Contoh: RS X, dr. Y, alamat..."
                                            />
                                            {fieldErrors.doctor_hospital_history && <p className="text-xs text-red-500">Data dokter/RS wajib diisi.</p>}
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Kronologis kecelakaan (jika ada)</Label>
                                            <Textarea
                                                value={formData.accident_chronology}
                                                onChange={(e) => setFormData({ ...formData, accident_chronology: e.target.value })}
                                                className="bg-transparent"
                                                placeholder="Opsional untuk klaim karena kecelakaan."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Pengaruh alkohol / narkotika / obat lain</Label>
                                            <Select
                                                value={formData.alcohol_drug_related}
                                                onValueChange={(val) => {
                                                    setFormData({ ...formData, alcohol_drug_related: val });
                                                    if (fieldErrors.alcohol_drug_related) setFieldErrors({ ...fieldErrors, alcohol_drug_related: false });
                                                }}
                                            >
                                                <SelectTrigger className={cn("bg-transparent", fieldErrors.alcohol_drug_related && "border-red-500")}>
                                                    <SelectValue placeholder="Pilih" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="TIDAK">Tidak</SelectItem>
                                                    <SelectItem value="YA">Ya</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {fieldErrors.alcohol_drug_related && <p className="text-xs text-red-500">Status alkohol/narkotika wajib dipilih.</p>}
                                        </div>
                                        {formData.claim_category === "MENINGGAL_DUNIA" && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Tanggal & jam meninggal</Label>
                                                    <Input
                                                        type="text"
                                                        value={formData.death_datetime}
                                                        onChange={(e) => {
                                                            setFormData({ ...formData, death_datetime: e.target.value });
                                                            if (fieldErrors.death_datetime) setFieldErrors({ ...fieldErrors, death_datetime: false });
                                                        }}
                                                        placeholder="Contoh: 10/02/2026 14:30"
                                                        className={cn("bg-transparent", fieldErrors.death_datetime && "border-red-500")}
                                                    />
                                                    {fieldErrors.death_datetime && <p className="text-xs text-red-500">Tanggal & jam meninggal wajib diisi.</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Tempat meninggal</Label>
                                                    <Input
                                                        type="text"
                                                        value={formData.death_place}
                                                        onChange={(e) => {
                                                            setFormData({ ...formData, death_place: e.target.value });
                                                            if (fieldErrors.death_place) setFieldErrors({ ...fieldErrors, death_place: false });
                                                        }}
                                                        className={cn("bg-transparent", fieldErrors.death_place && "border-red-500")}
                                                    />
                                                    {fieldErrors.death_place && <p className="text-xs text-red-500">Tempat meninggal wajib diisi.</p>}
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label>Catatan penerima manfaat yang ditunjuk</Label>
                                                    <Textarea
                                                        value={formData.beneficiary_notes}
                                                        onChange={(e) => setFormData({ ...formData, beneficiary_notes: e.target.value })}
                                                        className="bg-transparent"
                                                        placeholder="Isi nama, hubungan, atau catatan penerima manfaat."
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Confirmation */}
                        {currentStep === 3 && (
                            <div className="flex flex-col items-center justify-center space-y-8 py-6 text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center shadow-2xl"
                                >
                                    <FileText className="w-10 h-10" />
                                </motion.div>
                                <div className="space-y-2 max-w-md">
                                    <h3 className="text-3xl font-bold">Review Klaim</h3>
                                    <p className="text-muted-foreground">
                                        Pastikan data klaim sudah benar.
                                    </p>
                                </div>

                                <div className="w-full max-w-2xl bg-muted/20 rounded-xl p-8 text-left space-y-6 border border-border/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Nasabah</h4>
                                            <div className="space-y-1">
                                                <span className="text-lg font-medium">{getClientName()}</span>
                                                <span className="text-sm text-muted-foreground block">ID: {formData.client_id}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Detail Klaim</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Rumah Sakit</span>
                                                    <span className="font-medium">{getHospitalName()}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Diagnosa</span>
                                                    <span className="font-medium">{getDiseaseName()}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Tanggal</span>
                                                    <span className="font-medium">{new Date(formData.claim_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                </div>
                                                <div className="pt-2 border-t mt-2">
                                                    <span className="text-xs text-muted-foreground block">Perkiraan Biaya</span>
                                                    <span className="font-bold text-lg text-emerald-600">
                                                        {formData.total_amount ? `Rp ${parseInt(formData.total_amount).toLocaleString("id-ID")}` : "-"}
                                                    </span>
                                                </div>
                                                <div className="pt-2 border-t mt-2">
                                                    <span className="text-xs text-muted-foreground block">Kategori & Jenis Manfaat</span>
                                                    <span className="font-medium">{formData.claim_category === "MENINGGAL_DUNIA" ? "Meninggal Dunia" : "Manfaat Hidup"} / {formData.benefit_type || "-"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Penyebab Klaim</span>
                                                    <span className="font-medium">{formData.care_cause || "-"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t">
                                        <Label>Catatan Tambahan</Label>
                                        <Textarea
                                            placeholder="Tambahkan catatan jika perlu..."
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8 mt-auto border-t">
                <Button
                    variant="ghost"
                    onClick={prevStep}
                    disabled={currentStep === 1 || isLoading}
                    className="w-32 hover:bg-transparent hover:text-muted-foreground pl-0 justify-start"
                >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Kembali
                </Button>

                {currentStep < 3 ? (
                    <Button
                        onClick={nextStep}
                        disabled={isLoading}
                        className="w-40 bg-black hover:bg-gray-900 text-white rounded-full h-12"
                    >
                        Lanjut
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                ) : (
                    <LiquidButton
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-48"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 w-4 h-4" />
                                Simpan Klaim
                            </>
                        )}
                    </LiquidButton>
                )}
            </div>

        </div>
    );
}
