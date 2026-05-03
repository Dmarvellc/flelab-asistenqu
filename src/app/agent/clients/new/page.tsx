"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    CheckCircle2, Upload, FileText, User, ShieldCheck, Loader2, ArrowRight, ArrowLeft,
    AlertTriangle, Hash, Building2, CalendarDays, CreditCard, Mail, MapPin, AlertCircle,
    Heart, Users, Plus, Trash2, Wallet, Star, Briefcase, RefreshCw,
    Activity, Clock, Globe, Stethoscope, Percent, Timer, BadgeCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import { motion, AnimatePresence } from "motion/react";
import { PhoneInput } from "@/components/ui/phone-input";

/* ─── Types ──────────────────────────────────────────────────────── */
type Region = { code: string; name: string };
type Rider = { name: string; coverage: string };
type Beneficiary = { name: string; relationship: string; percentage: string };

const STEPS = [
    { id: 1, title: "Upload Polis",  description: "Unggah dokumen", icon: Upload },
    { id: 2, title: "Data Polis",    description: "Info & Premi",   icon: FileText },
    { id: 3, title: "Manfaat",       description: "Benefit & Rider", icon: Heart },
    { id: 4, title: "Pembayaran",    description: "Autodebit",       icon: Wallet },
    { id: 5, title: "Data Klien",    description: "Data Diri",       icon: User },
    { id: 6, title: "Konfirmasi",    description: "Selesai",         icon: ShieldCheck },
];

/* ─── Helper Components ──────────────────────────────────────────── */
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border/60 p-5 space-y-4 bg-muted/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Icon className="w-3.5 h-3.5" /> {title}
            </h3>
            {children}
        </div>
    );
}

function ErrMsg({ show, msg }: { show?: boolean; msg: string }) {
    if (!show) return null;
    return <p className="text-xs text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3 shrink-0" /> {msg}</p>;
}

function CurrencyInput({ value, onChange, placeholder, error }: { value: string; onChange: (v: string) => void; placeholder?: string; error?: boolean }) {
    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">Rp</span>
            <Input
                type="number" value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? "0"}
                className={cn("h-10 rounded-lg bg-background pl-9", error && "border-red-500")}
            />
        </div>
    );
}

function idrFmt(v: string) {
    const n = parseInt(v || "0");
    return isNaN(n) ? "Rp 0" : "Rp " + n.toLocaleString("id-ID");
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function NewClientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    // Address cascades
    const [provinces, setProvinces]   = useState<Region[]>([]);
    const [regencies, setRegencies]   = useState<Region[]>([]);
    const [districts, setDistricts]   = useState<Region[]>([]);
    const [villages, setVillages]     = useState<Region[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);

    // Dynamic arrays
    const [riders, setRiders] = useState<Rider[]>([{ name: "", coverage: "" }]);
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([{ name: "", relationship: "PASANGAN", percentage: "100" }]);

    // Tertanggung toggle
    const [insuredSameAsPolicyholder, setInsuredSameAsPolicyholder] = useState(true);

    const [formData, setFormData] = useState({
        // Step 2 — Data Polis
        policyNumber: "",
        insuranceCompany: "",
        productName: "",
        policyType: "",           // JIWA | KESEHATAN | JIWA_KESEHATAN | KECELAKAAN | UNITLINK
        currency: "IDR",
        issueDate: "",            // Tanggal terbit polis
        startDate: "",
        endDate: "",
        dueDay: "",               // 1–28: tanggal jatuh tempo setiap periode
        nextDueDate: "",          // Tanggal jatuh tempo premi berikutnya (full date)
        gracePeriodDays: "30",    // Masa tenggang (hari)
        reinstatementPeriod: "24",// Masa pemulihan polis (bulan)
        policyTerm: "",           // Jangka waktu polis (tahun)
        premiumPaymentTerm: "",   // Jangka waktu bayar premi (tahun)
        policyStatus: "AKTIF",    // AKTIF | LAPSE | PAID_UP | SURRENDERED | MATURED
        underwritingStatus: "STANDARD", // STANDARD | SUB_STANDARD | EXCLUSION
        sumInsured: "",
        premiumAmount: "",
        premiumFrequency: "MONTHLY",  // MONTHLY | QUARTERLY | SEMESTERLY | YEARLY

        // Step 3 — Manfaat
        coverageArea: "INDONESIA",    // INDONESIA | ASIA | ASIA_AUSTRALIA | WORLDWIDE_EXCL_US | WORLDWIDE
        roomPlan: "",                 // Kelas kamar (mis: Standard / VIP)
        annualLimit: "",              // Limit tahunan total
        lifetimeLimit: "",            // Limit seumur hidup
        deductible: "",               // Excess per klaim
        coinsurancePct: "",           // Co-insurance %
        waitingPeriodDays: "30",      // Masa tunggu (hari)
        preExistingCovered: "NO",     // YES | NO | AFTER_2_YEARS
        cashlessNetwork: "",          // Jaringan RS rekanan
        benefitLife: "",
        benefitAccidentalDeath: "",   // ADB
        benefitHospitalization: "",   // Kamar per hari
        benefitIcu: "",               // ICU per hari
        benefitSurgery: "",           // Pembedahan
        benefitOutpatient: "",        // Rawat jalan / tahun
        benefitDailyCash: "",         // Santunan harian
        benefitMaternity: "",         // Melahirkan
        benefitDental: "",            // Gigi
        benefitOptical: "",           // Kacamata
        benefitAmbulance: "",         // Ambulance per kejadian
        benefitMedicalCheckup: "",    // Medical checkup / tahun
        benefitDisability: "",
        benefitCritical: "",

        // Step 4 — Pembayaran
        paymentMethod: "",        // TRANSFER | AUTODEBET_REKENING | AUTODEBET_KK | VIRTUAL_ACCOUNT
        bankName: "",
        accountNumber: "",
        accountHolderName: "",
        cardExpiry: "",           // MM/YY
        cardNetwork: "",          // VISA | MASTERCARD | JCB | AMEX
        virtualAccountNumber: "",
        autodebetStartDate: "",   // Mulai berlaku autodebet
        autodebetEndDate: "",     // Berakhir autodebet (exp)
        autodebetMandateRef: "",  // Nomor referensi mandat/otorisasi autodebet
        billingCycleDay: "",      // Tanggal tagih autodebet tiap periode

        // Step 5 — Data Klien
        fullName: "",
        nik: "",
        passportNumber: "",
        birthDate: "",
        gender: "",
        phoneNumber: "",
        email: "",
        occupation: "",
        maritalStatus: "",

        // Tertanggung (jika beda dari pemegang polis)
        insuredName: "",
        insuredNIK: "",
        insuredBirthDate: "",
        insuredGender: "",
        insuredRelationship: "",

        // Alamat
        addressStreet: "",
        provinceId: "",
        regencyId: "",
        districtId: "",
        villageId: "",
        postalCode: "",

        // Meta
        policyFileBase64: "",
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Shorthand updater that also clears field error
    const update = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: false }));
    };

    // Rider helpers
    const addRider = () => setRiders(prev => [...prev, { name: "", coverage: "" }]);
    const removeRider = (i: number) => setRiders(prev => prev.filter((_, idx) => idx !== i));
    const updateRider = (i: number, field: keyof Rider, value: string) =>
        setRiders(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

    // Beneficiary helpers
    const addBeneficiary = () => setBeneficiaries(prev => [...prev, { name: "", relationship: "ANAK", percentage: "" }]);
    const removeBeneficiary = (i: number) => setBeneficiaries(prev => prev.filter((_, idx) => idx !== i));
    const updateBeneficiary = (i: number, field: keyof Beneficiary, value: string) =>
        setBeneficiaries(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b));

    // Card expiry auto-format MM/YY
    const handleCardExpiry = (raw: string) => {
        const digits = raw.replace(/\D/g, "").slice(0, 4);
        update("cardExpiry", digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits);
    };

    /* ── Address Effects ────────────────────────────────────────── */
    useEffect(() => {
        fetch("/api/wilayah/provinces").then(r => r.json()).then(d => { if (Array.isArray(d)) setProvinces(d); });
    }, []);

    useEffect(() => {
        if (!formData.provinceId) { setRegencies([]); return; }
        setAddressLoading(true);
        fetch(`/api/wilayah/regencies?province_code=${formData.provinceId}`).then(r => r.json())
            .then(d => { if (Array.isArray(d)) setRegencies(d); }).finally(() => setAddressLoading(false));
    }, [formData.provinceId]);

    useEffect(() => {
        if (!formData.regencyId) { setDistricts([]); return; }
        setAddressLoading(true);
        fetch(`/api/wilayah/districts?regency_code=${formData.regencyId}`).then(r => r.json())
            .then(d => { if (Array.isArray(d)) setDistricts(d); }).finally(() => setAddressLoading(false));
    }, [formData.regencyId]);

    useEffect(() => {
        if (!formData.districtId) { setVillages([]); return; }
        setAddressLoading(true);
        fetch(`/api/wilayah/villages?district_code=${formData.districtId}`).then(r => r.json())
            .then(d => { if (Array.isArray(d)) setVillages(d); }).finally(() => setAddressLoading(false));
    }, [formData.districtId]);

    /* ── File Handler ───────────────────────────────────────────── */
    const MAX_FILE_MB = 10;
    const acceptFile = (f: File) => {
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
            setAiError(`Ukuran file melebihi ${MAX_FILE_MB}MB.`);
            toast({ title: "File terlalu besar", description: `Maksimum ${MAX_FILE_MB}MB.`, variant: "destructive" });
            return;
        }
        const okType = f.type.startsWith("image/") || f.type === "application/pdf";
        if (!okType) {
            setAiError("Format tidak didukung. Gunakan JPG, PNG, atau PDF.");
            toast({ title: "Format tidak didukung", description: "Gunakan JPG, PNG, atau PDF.", variant: "destructive" });
            return;
        }
        setFile(f);
        setAiError(null);
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            update("policyFileBase64", dataUrl);
            if (f.type.startsWith("image/")) setFilePreview(dataUrl);
            else setFilePreview(null);
        };
        reader.readAsDataURL(f);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) acceptFile(e.target.files[0]);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files?.[0]) acceptFile(e.dataTransfer.files[0]);
    };

    const clearFile = () => {
        setFile(null);
        setFilePreview(null);
        update("policyFileBase64", "");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    /* ── AI Parse ───────────────────────────────────────────────── */
    const handleParsePolicy = async () => {
        if (!file) return;
        setIsLoading(true);
        setAiError(null);
        const payload = new FormData();
        payload.append("file", file);
        try {
            const res = await fetch("/api/agent/parse-policy", { method: "POST", body: payload });
            const data = await res.json();
            if (res.ok && data.data) {
                const p = data.data;
                if (p.is_valid_policy === false) {
                    setAiError("Dokumen ini bukan polis asuransi. Silakan unggah dokumen yang benar.");
                    toast({ title: "Dokumen Tidak Valid", variant: "destructive" });
                    setIsLoading(false);
                    return;
                }
                setFormData(prev => ({
                    ...prev,
                    policyNumber:          p.policy_number          || "",
                    insuranceCompany:      p.insurance_company      || "",
                    productName:           p.product_name           || "",
                    policyType:            p.policy_type            || "",
                    issueDate:             p.issue_date             || "",
                    startDate:             p.start_date             || "",
                    endDate:               p.end_date               || "",
                    dueDay:                p.due_day?.toString()    || "",
                    nextDueDate:           p.next_due_date          || "",
                    policyTerm:            p.policy_term?.toString() || "",
                    premiumPaymentTerm:    p.premium_payment_term?.toString() || "",
                    sumInsured:            p.sum_insured?.toString()|| "",
                    premiumAmount:         p.premium_amount?.toString() || "",
                    premiumFrequency:      p.premium_frequency      || "MONTHLY",
                    coverageArea:          p.coverage_area          || "INDONESIA",
                    roomPlan:              p.room_plan              || "",
                    annualLimit:           p.annual_limit?.toString() || "",
                    benefitLife:           p.benefit_life?.toString()    || "",
                    benefitAccidentalDeath:p.benefit_accidental_death?.toString() || "",
                    benefitHospitalization:p.benefit_hospitalization?.toString() || "",
                    benefitIcu:            p.benefit_icu?.toString() || "",
                    benefitSurgery:        p.benefit_surgery?.toString() || "",
                    benefitOutpatient:     p.benefit_outpatient?.toString() || "",
                    benefitDailyCash:      p.benefit_daily_cash?.toString() || "",
                    benefitMaternity:      p.benefit_maternity?.toString() || "",
                    benefitDental:         p.benefit_dental?.toString() || "",
                    benefitOptical:        p.benefit_optical?.toString() || "",
                    benefitAmbulance:      p.benefit_ambulance?.toString() || "",
                    benefitMedicalCheckup: p.benefit_medical_checkup?.toString() || "",
                    benefitDisability:     p.benefit_disability?.toString() || "",
                    benefitCritical:       p.benefit_critical?.toString()  || "",
                    fullName:              p.policy_holder_name     || "",
                    passportNumber:        p.passport_number        || "",
                }));
                if (p.riders?.length)        setRiders(p.riders);
                if (p.beneficiaries?.length) setBeneficiaries(p.beneficiaries.map((b: { name: string; relationship: string; percentage: number }) => ({ ...b, percentage: b.percentage?.toString() || "" })));
                toast({ title: "Scan Berhasil", description: "Data berhasil diekstrak dari dokumen." });
                setCurrentStep(2);
            } else {
                toast({ title: "Gagal Membaca Dokumen", description: "Pastikan gambar jelas dan merupakan polis asuransi.", variant: "destructive" });
            }
        } catch {
            toast({ title: "Gagal Memproses", description: "Terjadi kesalahan. Silakan coba lagi.", variant: "destructive" });
        } finally { setIsLoading(false); }
    };

    /* ── Validation ─────────────────────────────────────────────── */
    const validate = (step: number): boolean => {
        const e: Record<string, boolean> = {};

        if (step === 2) {
            ["policyNumber", "insuranceCompany", "productName", "policyType",
             "startDate", "endDate", "dueDay", "sumInsured", "premiumAmount", "premiumFrequency"]
                .forEach(f => { if (!formData[f as keyof typeof formData]) e[f] = true; });
        }

        if (step === 3) {
            if (!formData.benefitLife) e.benefitLife = true;
            if (beneficiaries.every(b => !b.name)) e.beneficiaries = true;
        }

        if (step === 4) {
            if (!formData.paymentMethod) e.paymentMethod = true;
            else {
                const m = formData.paymentMethod;
                if (["AUTODEBET_REKENING", "TRANSFER", "AUTODEBET_KK"].includes(m)) {
                    if (!formData.bankName) e.bankName = true;
                    if (!formData.accountHolderName) e.accountHolderName = true;
                }
                if (m === "AUTODEBET_REKENING" || m === "TRANSFER") {
                    if (!formData.accountNumber) e.accountNumber = true;
                }
                if (m === "AUTODEBET_REKENING") {
                    if (!formData.autodebetStartDate) e.autodebetStartDate = true;
                    if (!formData.autodebetEndDate) e.autodebetEndDate = true;
                }
                if (m === "AUTODEBET_KK") {
                    if (!formData.accountNumber) e.accountNumber = true;
                    if (!formData.cardExpiry || formData.cardExpiry.length < 5) e.cardExpiry = true;
                    if (!formData.autodebetStartDate) e.autodebetStartDate = true;
                    if (!formData.autodebetEndDate) e.autodebetEndDate = true;
                }
                if (m === "VIRTUAL_ACCOUNT") {
                    if (!formData.bankName) e.bankName = true;
                    if (!formData.virtualAccountNumber) e.virtualAccountNumber = true;
                }
            }
        }

        if (step === 5) {
            ["fullName", "nik", "birthDate", "gender", "phoneNumber", "email",
             "addressStreet", "provinceId", "regencyId", "districtId", "villageId", "postalCode"]
                .forEach(f => { if (!formData[f as keyof typeof formData]) e[f] = true; });
            if (!insuredSameAsPolicyholder) {
                ["insuredName", "insuredNIK", "insuredBirthDate", "insuredGender", "insuredRelationship"]
                    .forEach(f => { if (!formData[f as keyof typeof formData]) e[f] = true; });
            }
        }

        setFieldErrors(e);
        if (Object.values(e).some(Boolean)) {
            toast({ title: "Data Belum Lengkap", description: "Mohon isi semua kolom yang diperlukan.", variant: "destructive" });
            return false;
        }
        return true;
    };

    /* ── Submit ─────────────────────────────────────────────────── */
    const handleSubmit = async () => {
        setIsLoading(true);
        const provName  = provinces.find(p => p.code === formData.provinceId)?.name  || "";
        const regName   = regencies.find(r => r.code === formData.regencyId)?.name   || "";
        const distName  = districts.find(d => d.code === formData.districtId)?.name  || "";
        const villName  = villages.find(v => v.code === formData.villageId)?.name    || "";
        const fullAddress = `${formData.addressStreet}, ${villName}, ${distName}, ${regName}, ${provName} ${formData.postalCode}`;

        try {
            const res = await fetch("/api/agent/clients/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    address: fullAddress,
                    riders: riders.filter(r => r.name),
                    beneficiaries: beneficiaries.filter(b => b.name),
                    insuredSameAsPolicyholder,
                }),
            });

            if (res.ok) {
                toast({ title: "Berhasil", description: "Data klien dan polis berhasil disimpan." });
                router.push("/agent/clients");
            } else {
                const d = await res.json();
                toast({ title: "Gagal Menyimpan", description: d.error || "Terjadi kesalahan.", variant: "destructive" });
            }
        } catch {
            toast({ title: "Kesalahan Sistem", description: "Terjadi gangguan pada server.", variant: "destructive" });
        } finally { setIsLoading(false); }
    };

    const nextStep = () => {
        if (currentStep === 1 && file) { handleParsePolicy(); return; }
        if (validate(currentStep)) setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    };
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const variants = {
        enter: (d: number) => ({ x: d > 0 ? 20 : -20, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d < 0 ? 20 : -20, opacity: 0 }),
    };

    const payMethodLabel: Record<string, string> = {
        TRANSFER: "Transfer Manual",
        AUTODEBET_REKENING: "Autodebet Rekening Bank",
        AUTODEBET_KK: "Autodebet Kartu Kredit",
        VIRTUAL_ACCOUNT: "Virtual Account (VA)",
    };

    const freqLabel: Record<string, string> = {
        MONTHLY: "Bulanan", QUARTERLY: "Triwulanan",
        SEMESTERLY: "Semesteran", YEARLY: "Tahunan",
    };

    /* ── Render ─────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex flex-1 min-h-0">

                {/* ── Sidebar Stepper ───────────────────────────── */}
                <div className="w-60 shrink-0 border-r border-border/60 pr-6 flex flex-col pt-1">
                    <div className="mb-8">
                        <h1 className="text-xl font-bold tracking-tight">Tambah Klien Baru</h1>
                        <p className="text-xs text-muted-foreground mt-1">Unggah polis untuk isi data otomatis.</p>
                    </div>
                    <nav className="flex flex-col gap-1">
                        {STEPS.map(step => {
                            const isActive    = step.id === currentStep;
                            const isCompleted = step.id < currentStep;
                            const Icon = step.icon;
                            return (
                                <div key={step.id} className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                                    isActive ? "bg-black text-white shadow-sm" : isCompleted ? "text-foreground bg-muted/40" : "text-muted-foreground"
                                )}>
                                    <div className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                                        isActive ? "border-white/20 bg-white/10" : isCompleted ? "border-black bg-black text-white" : "border-border bg-background"
                                    )}>
                                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold leading-tight truncate">{step.title}</p>
                                        <p className={cn("text-[11px] leading-tight truncate mt-0.5", isActive ? "text-white/50" : "text-muted-foreground")}>{step.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </nav>
                </div>

                {/* ── Content Area ──────────────────────────────── */}
                <div className="flex-1 flex flex-col pl-8 min-w-0 overflow-y-auto">
                    <AnimatePresence mode="wait" custom={currentStep}>
                        <motion.div
                            key={currentStep}
                            custom={currentStep}
                            variants={variants}
                            initial="enter" animate="center" exit="exit"
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="w-full"
                        >

                            {/* ════════ STEP 1: Upload ════════ */}
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <div
                                        onClick={() => !file && fileInputRef.current?.click()}
                                        onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
                                        onDragLeave={() => setIsDragActive(false)}
                                        onDrop={handleDrop}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center space-y-5 py-14 border-2 border-dashed rounded-2xl transition-all bg-muted/5",
                                            !file && "cursor-pointer hover:bg-muted/10",
                                            isDragActive ? "border-black bg-black/5 scale-[1.01]" :
                                            aiError ? "border-red-500 bg-red-50/10" : "border-muted-foreground/25 hover:border-black/50"
                                        )}
                                    >
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />

                                        {!file ? (
                                            <>
                                                <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner transition-all",
                                                    isDragActive ? "bg-black text-white scale-110" : "bg-muted")}>
                                                    <Upload className={cn("w-8 h-8 transition-all", isDragActive ? "animate-bounce" : "text-muted-foreground")} />
                                                </div>
                                                <div className="text-center space-y-1.5 px-4">
                                                    <h3 className="text-xl font-semibold">{isDragActive ? "Lepas di sini" : "Unggah Dokumen Polis"}</h3>
                                                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                                        Tarik & lepas atau <span className="font-semibold text-foreground underline underline-offset-2">klik</span> untuk memilih file.
                                                        <br/>AI akan mengekstrak data polis secara otomatis.
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-muted-foreground">
                                                    <span className="px-2 py-1 rounded-md bg-muted/50 border">PDF</span>
                                                    <span className="px-2 py-1 rounded-md bg-muted/50 border">JPG</span>
                                                    <span className="px-2 py-1 rounded-md bg-muted/50 border">PNG</span>
                                                    <span>•</span>
                                                    <span>Maks. {MAX_FILE_MB}MB</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full max-w-xl flex flex-col items-center gap-4">
                                                {filePreview ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img src={filePreview} alt={file.name} className="max-h-64 rounded-xl border shadow-md object-contain" />
                                                ) : (
                                                    <div className="w-48 h-56 rounded-xl border-2 border-border bg-rose-50 flex flex-col items-center justify-center gap-2 shadow-sm">
                                                        <FileText className="w-14 h-14 text-rose-400" />
                                                        <span className="text-[10px] font-bold tracking-wider text-rose-700 uppercase">PDF</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 bg-white border px-4 py-3 rounded-xl shadow-sm w-full">
                                                    <div className="bg-emerald-100 p-2 rounded-full shrink-0"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
                                                    <div className="text-left min-w-0 flex-1">
                                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || "unknown"}</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); clearFile(); }} className="h-8 text-muted-foreground hover:text-red-500 gap-1.5">
                                                        <Trash2 className="w-3.5 h-3.5" /> Ganti
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Klik <span className="font-semibold">&quot;Lanjut&quot;</span> untuk memulai ekstraksi AI.</p>
                                            </div>
                                        )}
                                    </div>
                                    {aiError && (
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">
                                            <AlertTriangle className="w-5 h-5 shrink-0" />
                                            <p className="text-sm font-medium">{aiError}</p>
                                        </div>
                                    )}
                                    {!file && <p className="text-xs text-muted-foreground text-center">Tidak punya file? Klik &quot;Lanjut&quot; untuk isi data manual.</p>}
                                </div>
                            )}

                            {/* ════════ STEP 2: Data Polis ════════ */}
                            {currentStep === 2 && (
                                <div className="space-y-5 pb-4">
                                    <div className="mb-2">
                                        <h2 className="text-lg font-semibold">Data Polis</h2>
                                        <p className="text-sm text-muted-foreground">Verifikasi dan lengkapi informasi polis.</p>
                                    </div>

                                    {/* Identitas Polis */}
                                    <Section title="Identitas Polis" icon={FileText}>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomor Polis *</Label>
                                                <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input value={formData.policyNumber} onChange={e => update("policyNumber", e.target.value)} placeholder="POL-2024-00123" className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.policyNumber && "border-red-500")} />
                                                </div>
                                                <ErrMsg show={fieldErrors.policyNumber} msg="Nomor polis wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perusahaan Asuransi *</Label>
                                                <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input value={formData.insuranceCompany} onChange={e => update("insuranceCompany", e.target.value)} placeholder="Prudential Life" className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.insuranceCompany && "border-red-500")} />
                                                </div>
                                                <ErrMsg show={fieldErrors.insuranceCompany} msg="Wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Produk *</Label>
                                                <div className="relative"><ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input value={formData.productName} onChange={e => update("productName", e.target.value)} placeholder="PRUlink Assurance" className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.productName && "border-red-500")} />
                                                </div>
                                                <ErrMsg show={fieldErrors.productName} msg="Wajib diisi." />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis Polis *</Label>
                                                <Select value={formData.policyType} onValueChange={v => update("policyType", v)}>
                                                    <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.policyType && "border-red-500")}>
                                                        <SelectValue placeholder="Pilih jenis polis" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="JIWA">Asuransi Jiwa</SelectItem>
                                                        <SelectItem value="KESEHATAN">Asuransi Kesehatan</SelectItem>
                                                        <SelectItem value="JIWA_KESEHATAN">Jiwa + Kesehatan</SelectItem>
                                                        <SelectItem value="KECELAKAAN">Asuransi Kecelakaan</SelectItem>
                                                        <SelectItem value="UNITLINK">Unit Link</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <ErrMsg show={fieldErrors.policyType} msg="Jenis polis wajib dipilih." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mata Uang</Label>
                                                <Select value={formData.currency} onValueChange={v => update("currency", v)}>
                                                    <SelectTrigger className="h-10 rounded-lg bg-background">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="IDR">IDR — Rupiah</SelectItem>
                                                        <SelectItem value="USD">USD — Dolar Amerika</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </Section>

                                    {/* Periode Polis */}
                                    <Section title="Periode Polis" icon={CalendarDays}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Terbit</Label>
                                                <Input type="date" value={formData.issueDate} onChange={e => update("issueDate", e.target.value)} className="h-10 rounded-lg bg-background" />
                                                <p className="text-[10px] text-muted-foreground">Issue date polis</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Mulai *</Label>
                                                <Input type="date" value={formData.startDate} onChange={e => update("startDate", e.target.value)} className={cn("h-10 rounded-lg bg-background", fieldErrors.startDate && "border-red-500")} />
                                                <ErrMsg show={fieldErrors.startDate} msg="Wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Berakhir *</Label>
                                                <Input type="date" value={formData.endDate} onChange={e => update("endDate", e.target.value)} className={cn("h-10 rounded-lg bg-background", fieldErrors.endDate && "border-red-500")} />
                                                <ErrMsg show={fieldErrors.endDate} msg="Wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Polis</Label>
                                                <Select value={formData.policyStatus} onValueChange={v => update("policyStatus", v)}>
                                                    <SelectTrigger className="h-10 rounded-lg bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="AKTIF">Aktif</SelectItem>
                                                        <SelectItem value="LAPSE">Lapse (Tunggak)</SelectItem>
                                                        <SelectItem value="PAID_UP">Paid-Up (Bebas Premi)</SelectItem>
                                                        <SelectItem value="SURRENDERED">Surrendered</SelectItem>
                                                        <SelectItem value="MATURED">Matured (Jatuh Tempo)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jangka Waktu Polis</Label>
                                                <div className="relative">
                                                    <Input type="number" min={1} max={99} value={formData.policyTerm} onChange={e => update("policyTerm", e.target.value)} placeholder="10" className="h-10 rounded-lg bg-background pr-12" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">tahun</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Masa Bayar Premi</Label>
                                                <div className="relative">
                                                    <Input type="number" min={1} max={99} value={formData.premiumPaymentTerm} onChange={e => update("premiumPaymentTerm", e.target.value)} placeholder="5" className="h-10 rounded-lg bg-background pr-12" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">tahun</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Underwriting</Label>
                                                <Select value={formData.underwritingStatus} onValueChange={v => update("underwritingStatus", v)}>
                                                    <SelectTrigger className="h-10 rounded-lg bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="STANDARD">Standard</SelectItem>
                                                        <SelectItem value="SUB_STANDARD">Sub-Standard (Extra Premi)</SelectItem>
                                                        <SelectItem value="EXCLUSION">Dengan Pengecualian</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Masa Pemulihan</Label>
                                                <div className="relative">
                                                    <Input type="number" min={0} max={60} value={formData.reinstatementPeriod} onChange={e => update("reinstatementPeriod", e.target.value)} placeholder="24" className="h-10 rounded-lg bg-background pr-12" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">bulan</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">Reinstatement period</p>
                                            </div>
                                        </div>
                                    </Section>

                                    {/* Jatuh Tempo & Masa Tenggang */}
                                    <Section title="Jatuh Tempo Premi & Masa Tenggang" icon={Timer}>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tgl. Jatuh Tempo Tiap Periode *</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">Tgl.</span>
                                                    <Input
                                                        type="number" min={1} max={28}
                                                        value={formData.dueDay}
                                                        onChange={e => update("dueDay", e.target.value)}
                                                        placeholder="15"
                                                        className={cn("h-10 rounded-lg bg-background pl-10", fieldErrors.dueDay && "border-red-500")}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">Tanggal bayar premi tiap periode (1–28)</p>
                                                <ErrMsg show={fieldErrors.dueDay} msg="Jatuh tempo wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jatuh Tempo Berikutnya</Label>
                                                <Input type="date" value={formData.nextDueDate} onChange={e => update("nextDueDate", e.target.value)} className="h-10 rounded-lg bg-background" />
                                                <p className="text-[10px] text-muted-foreground">Tanggal bayar premi selanjutnya</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Masa Tenggang</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input type="number" min={0} max={90} value={formData.gracePeriodDays} onChange={e => update("gracePeriodDays", e.target.value)} placeholder="30" className="h-10 rounded-lg bg-background pl-9 pr-12" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hari</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">Grace period setelah jatuh tempo</p>
                                            </div>
                                        </div>
                                    </Section>

                                    {/* Nilai Pertanggungan */}
                                    <Section title="Nilai Pertanggungan & Premi" icon={ShieldCheck}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uang Pertanggungan *</Label>
                                                <CurrencyInput value={formData.sumInsured} onChange={v => update("sumInsured", v)} error={fieldErrors.sumInsured} />
                                                <ErrMsg show={fieldErrors.sumInsured} msg="Wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Premi *</Label>
                                                <CurrencyInput value={formData.premiumAmount} onChange={v => update("premiumAmount", v)} error={fieldErrors.premiumAmount} />
                                                <ErrMsg show={fieldErrors.premiumAmount} msg="Wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frekuensi Bayar *</Label>
                                                <Select value={formData.premiumFrequency} onValueChange={v => update("premiumFrequency", v)}>
                                                    <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.premiumFrequency && "border-red-500")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MONTHLY">Bulanan</SelectItem>
                                                        <SelectItem value="QUARTERLY">Triwulanan (3 bln)</SelectItem>
                                                        <SelectItem value="SEMESTERLY">Semesteran (6 bln)</SelectItem>
                                                        <SelectItem value="YEARLY">Tahunan</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <ErrMsg show={fieldErrors.premiumFrequency} msg="Wajib dipilih." />
                                            </div>
                                        </div>
                                    </Section>
                                </div>
                            )}

                            {/* ════════ STEP 3: Manfaat & Ahli Waris ════════ */}
                            {currentStep === 3 && (
                                <div className="space-y-5 pb-4">
                                    <div className="mb-2">
                                        <h2 className="text-lg font-semibold">Manfaat Polis</h2>
                                        <p className="text-sm text-muted-foreground">Detail manfaat, rider tambahan, dan ahli waris.</p>
                                    </div>

                                    {/* Cakupan & Plan */}
                                    <Section title="Cakupan & Plan Pertanggungan" icon={Globe}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Area Pertanggungan</Label>
                                                <Select value={formData.coverageArea} onValueChange={v => update("coverageArea", v)}>
                                                    <SelectTrigger className="h-10 rounded-lg bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="INDONESIA">Indonesia</SelectItem>
                                                        <SelectItem value="ASIA">Asia</SelectItem>
                                                        <SelectItem value="ASIA_AUSTRALIA">Asia + Australia</SelectItem>
                                                        <SelectItem value="WORLDWIDE_EXCL_US">Worldwide (Tanpa USA)</SelectItem>
                                                        <SelectItem value="WORLDWIDE">Worldwide (Termasuk USA)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan / Kelas Kamar</Label>
                                                <Input value={formData.roomPlan} onChange={e => update("roomPlan", e.target.value)} placeholder="Contoh: Standard / VIP / 1 Bed" className="h-10 rounded-lg bg-background" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Masa Tunggu</Label>
                                                <div className="relative">
                                                    <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input type="number" min={0} value={formData.waitingPeriodDays} onChange={e => update("waitingPeriodDays", e.target.value)} placeholder="30" className="h-10 rounded-lg bg-background pl-9 pr-12" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hari</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limit Tahunan</Label>
                                                <CurrencyInput value={formData.annualLimit} onChange={v => update("annualLimit", v)} placeholder="Annual limit" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limit Seumur Hidup</Label>
                                                <CurrencyInput value={formData.lifetimeLimit} onChange={v => update("lifetimeLimit", v)} placeholder="Lifetime limit" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kondisi Pre-Existing</Label>
                                                <Select value={formData.preExistingCovered} onValueChange={v => update("preExistingCovered", v)}>
                                                    <SelectTrigger className="h-10 rounded-lg bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NO">Tidak Dicover</SelectItem>
                                                        <SelectItem value="AFTER_2_YEARS">Dicover Setelah 2 Tahun</SelectItem>
                                                        <SelectItem value="YES">Dicover Sepenuhnya</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deductible / Excess</Label>
                                                <CurrencyInput value={formData.deductible} onChange={v => update("deductible", v)} placeholder="Per klaim" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Co-Insurance</Label>
                                                <div className="relative">
                                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input type="number" min={0} max={100} value={formData.coinsurancePct} onChange={e => update("coinsurancePct", e.target.value)} placeholder="0" className="h-10 rounded-lg bg-background pl-9 pr-8" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jaringan Cashless</Label>
                                                <div className="relative">
                                                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input value={formData.cashlessNetwork} onChange={e => update("cashlessNetwork", e.target.value)} placeholder="Contoh: AdMedika / Fullerton" className="h-10 rounded-lg bg-background pl-9" />
                                                </div>
                                            </div>
                                        </div>
                                    </Section>

                                    {/* Manfaat Jiwa & Kecelakaan */}
                                    <Section title="Manfaat Jiwa & Kecelakaan" icon={Heart}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manfaat Jiwa (UP) *</Label>
                                                <CurrencyInput value={formData.benefitLife} onChange={v => update("benefitLife", v)} error={fieldErrors.benefitLife} placeholder="Uang pertanggungan jiwa" />
                                                <ErrMsg show={fieldErrors.benefitLife} msg="Manfaat jiwa wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meninggal Akibat Kecelakaan (ADB)</Label>
                                                <CurrencyInput value={formData.benefitAccidentalDeath} onChange={v => update("benefitAccidentalDeath", v)} placeholder="Accidental death benefit" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cacat Tetap Total (TPD)</Label>
                                                <CurrencyInput value={formData.benefitDisability} onChange={v => update("benefitDisability", v)} placeholder="Total permanent disability" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penyakit Kritis (CI)</Label>
                                                <CurrencyInput value={formData.benefitCritical} onChange={v => update("benefitCritical", v)} placeholder="Critical illness" />
                                            </div>
                                        </div>
                                    </Section>

                                    {/* Manfaat Kesehatan */}
                                    <Section title="Manfaat Kesehatan" icon={Activity}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rawat Inap / Hari</Label>
                                                <CurrencyInput value={formData.benefitHospitalization} onChange={v => update("benefitHospitalization", v)} placeholder="Biaya kamar per hari" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ICU / Hari</Label>
                                                <CurrencyInput value={formData.benefitIcu} onChange={v => update("benefitIcu", v)} placeholder="ICU per hari" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pembedahan</Label>
                                                <CurrencyInput value={formData.benefitSurgery} onChange={v => update("benefitSurgery", v)} placeholder="Biaya pembedahan" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rawat Jalan / Tahun</Label>
                                                <CurrencyInput value={formData.benefitOutpatient} onChange={v => update("benefitOutpatient", v)} placeholder="Outpatient" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Santunan Harian</Label>
                                                <CurrencyInput value={formData.benefitDailyCash} onChange={v => update("benefitDailyCash", v)} placeholder="Daily cash allowance" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Melahirkan / Maternity</Label>
                                                <CurrencyInput value={formData.benefitMaternity} onChange={v => update("benefitMaternity", v)} placeholder="Maternity benefit" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manfaat Gigi</Label>
                                                <CurrencyInput value={formData.benefitDental} onChange={v => update("benefitDental", v)} placeholder="Dental / tahun" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manfaat Kacamata</Label>
                                                <CurrencyInput value={formData.benefitOptical} onChange={v => update("benefitOptical", v)} placeholder="Optical / tahun" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ambulance</Label>
                                                <CurrencyInput value={formData.benefitAmbulance} onChange={v => update("benefitAmbulance", v)} placeholder="Per kejadian" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medical Check-Up / Tahun</Label>
                                                <CurrencyInput value={formData.benefitMedicalCheckup} onChange={v => update("benefitMedicalCheckup", v)} placeholder="MCU tahunan" />
                                            </div>
                                        </div>
                                    </Section>

                                    {/* Rider Tambahan */}
                                    <Section title="Rider Tambahan" icon={Star}>
                                        <div className="space-y-3">
                                            {riders.map((rider, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                                        <div>
                                                            <Input value={rider.name} onChange={e => updateRider(i, "name", e.target.value)} placeholder="Nama rider (mis: Waiver of Premium)" className="h-9 rounded-lg bg-background text-sm" />
                                                        </div>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">Rp</span>
                                                            <Input value={rider.coverage} onChange={e => updateRider(i, "coverage", e.target.value)} placeholder="Nilai pertanggungan" type="number" className="h-9 rounded-lg bg-background pl-9 text-sm" />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeRider(i)} disabled={riders.length === 1} className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={addRider} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-2">
                                                <Plus className="w-3.5 h-3.5" /> Tambah Rider
                                            </button>
                                        </div>
                                    </Section>

                                    {/* Ahli Waris */}
                                    <Section title="Ahli Waris / Penerima Manfaat" icon={Users}>
                                        {fieldErrors.beneficiaries && (
                                            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-xs border border-red-100">
                                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Minimal satu ahli waris harus diisi.
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            {beneficiaries.map((b, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border/50">
                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <Input value={b.name} onChange={e => updateBeneficiary(i, "name", e.target.value)} placeholder="Nama lengkap" className="h-9 rounded-lg text-sm" />
                                                        <Select value={b.relationship} onValueChange={v => updateBeneficiary(i, "relationship", v)}>
                                                            <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue placeholder="Hubungan" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="PASANGAN">Pasangan</SelectItem>
                                                                <SelectItem value="ANAK">Anak</SelectItem>
                                                                <SelectItem value="ORANG_TUA">Orang Tua</SelectItem>
                                                                <SelectItem value="SAUDARA">Saudara Kandung</SelectItem>
                                                                <SelectItem value="LAINNYA">Lainnya</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="relative">
                                                            <Input type="number" min={1} max={100} value={b.percentage} onChange={e => updateBeneficiary(i, "percentage", e.target.value)} placeholder="%" className="h-9 rounded-lg text-sm pr-8" />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeBeneficiary(i)} disabled={beneficiaries.length === 1} className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={addBeneficiary} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-1">
                                                <Plus className="w-3.5 h-3.5" /> Tambah Ahli Waris
                                            </button>
                                        </div>
                                    </Section>
                                </div>
                            )}

                            {/* ════════ STEP 4: Pembayaran ════════ */}
                            {currentStep === 4 && (
                                <div className="space-y-5 pb-4">
                                    <div className="mb-2">
                                        <h2 className="text-lg font-semibold">Metode Pembayaran</h2>
                                        <p className="text-sm text-muted-foreground">Informasi autodebet, rekening, atau kartu kredit.</p>
                                    </div>

                                    <Section title="Metode Pembayaran" icon={Wallet}>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metode *</Label>
                                            <Select value={formData.paymentMethod} onValueChange={v => update("paymentMethod", v)}>
                                                <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.paymentMethod && "border-red-500")}>
                                                    <SelectValue placeholder="Pilih metode pembayaran" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="TRANSFER">Transfer Manual</SelectItem>
                                                    <SelectItem value="AUTODEBET_REKENING">Autodebet Rekening Bank</SelectItem>
                                                    <SelectItem value="AUTODEBET_KK">Autodebet Kartu Kredit</SelectItem>
                                                    <SelectItem value="VIRTUAL_ACCOUNT">Virtual Account (VA)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <ErrMsg show={fieldErrors.paymentMethod} msg="Metode pembayaran wajib dipilih." />
                                        </div>
                                    </Section>

                                    {/* Conditional fields */}
                                    {(formData.paymentMethod === "TRANSFER" || formData.paymentMethod === "AUTODEBET_REKENING") && (
                                        <Section title={formData.paymentMethod === "TRANSFER" ? "Detail Rekening Tujuan" : "Detail Rekening Autodebet"} icon={CreditCard}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Bank *</Label>
                                                    <Input value={formData.bankName} onChange={e => update("bankName", e.target.value)} placeholder="Contoh: BCA, Mandiri, BNI" className={cn("h-10 rounded-lg bg-background", fieldErrors.bankName && "border-red-500")} />
                                                    <ErrMsg show={fieldErrors.bankName} msg="Nama bank wajib diisi." />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomor Rekening *</Label>
                                                    <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                        <Input value={formData.accountNumber} onChange={e => update("accountNumber", e.target.value)} placeholder="Nomor rekening" className={cn("h-10 rounded-lg bg-background pl-9 tracking-widest", fieldErrors.accountNumber && "border-red-500")} />
                                                    </div>
                                                    <ErrMsg show={fieldErrors.accountNumber} msg="Nomor rekening wajib diisi." />
                                                </div>
                                                <div className="space-y-1.5 md:col-span-2">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Pemilik Rekening *</Label>
                                                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                        <Input value={formData.accountHolderName} onChange={e => update("accountHolderName", e.target.value)} placeholder="Nama sesuai buku tabungan" className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.accountHolderName && "border-red-500")} />
                                                    </div>
                                                    <ErrMsg show={fieldErrors.accountHolderName} msg="Nama pemilik wajib diisi." />
                                                </div>
                                            </div>
                                        </Section>
                                    )}

                                    {formData.paymentMethod === "AUTODEBET_REKENING" && (
                                        <Section title="Otorisasi & Masa Berlaku Autodebet" icon={BadgeCheck}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mulai Berlaku *</Label>
                                                    <Input type="date" value={formData.autodebetStartDate} onChange={e => update("autodebetStartDate", e.target.value)} className={cn("h-10 rounded-lg bg-background", fieldErrors.autodebetStartDate && "border-red-500")} />
                                                    <ErrMsg show={fieldErrors.autodebetStartDate} msg="Wajib diisi." />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Berakhir (Exp Autodebet) *</Label>
                                                    <Input type="date" value={formData.autodebetEndDate} onChange={e => update("autodebetEndDate", e.target.value)} className={cn("h-10 rounded-lg bg-background", fieldErrors.autodebetEndDate && "border-red-500")} />
                                                    <p className="text-[10px] text-muted-foreground">Tanggal habis masa berlaku otorisasi autodebet</p>
                                                    <ErrMsg show={fieldErrors.autodebetEndDate} msg="Tanggal exp wajib diisi." />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">No. Referensi Mandat</Label>
                                                    <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                        <Input value={formData.autodebetMandateRef} onChange={e => update("autodebetMandateRef", e.target.value)} placeholder="MND-XXXX-XXXX" className="h-10 rounded-lg bg-background pl-9" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Tagih Tiap Periode</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">Tgl.</span>
                                                        <Input type="number" min={1} max={28} value={formData.billingCycleDay} onChange={e => update("billingCycleDay", e.target.value)} placeholder="15" className="h-10 rounded-lg bg-background pl-10" />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">Default mengikuti jatuh tempo polis</p>
                                                </div>
                                            </div>
                                        </Section>
                                    )}

                                    {formData.paymentMethod === "AUTODEBET_KK" && (
                                        <>
                                            <Section title="Detail Kartu Kredit Autodebet" icon={CreditCard}>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penerbit Kartu / Bank *</Label>
                                                        <Input value={formData.bankName} onChange={e => update("bankName", e.target.value)} placeholder="Contoh: BCA, Mandiri, CIMB" className={cn("h-10 rounded-lg bg-background", fieldErrors.bankName && "border-red-500")} />
                                                        <ErrMsg show={fieldErrors.bankName} msg="Penerbit kartu wajib diisi." />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jaringan Kartu</Label>
                                                        <Select value={formData.cardNetwork} onValueChange={v => update("cardNetwork", v)}>
                                                            <SelectTrigger className="h-10 rounded-lg bg-background"><SelectValue placeholder="Pilih jaringan" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="VISA">Visa</SelectItem>
                                                                <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                                                                <SelectItem value="JCB">JCB</SelectItem>
                                                                <SelectItem value="AMEX">American Express</SelectItem>
                                                                <SelectItem value="UNIONPAY">UnionPay</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">4 Digit Terakhir Kartu *</Label>
                                                        <div className="relative"><CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                            <Input value={formData.accountNumber} onChange={e => update("accountNumber", e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="XXXX" maxLength={4} className={cn("h-10 rounded-lg bg-background pl-9 tracking-[0.4em]", fieldErrors.accountNumber && "border-red-500")} />
                                                        </div>
                                                        <ErrMsg show={fieldErrors.accountNumber} msg="4 digit terakhir wajib diisi." />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expired Kartu (MM/YY) *</Label>
                                                        <div className="relative"><CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                            <Input
                                                                value={formData.cardExpiry}
                                                                onChange={e => handleCardExpiry(e.target.value)}
                                                                placeholder="MM/YY"
                                                                maxLength={5}
                                                                className={cn("h-10 rounded-lg bg-background pl-9 tracking-widest", fieldErrors.cardExpiry && "border-red-500")}
                                                            />
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground">Masa berlaku fisik kartu kredit</p>
                                                        <ErrMsg show={fieldErrors.cardExpiry} msg="Expired date wajib diisi (MM/YY)." />
                                                    </div>
                                                    <div className="space-y-1.5 md:col-span-2">
                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Pemegang Kartu *</Label>
                                                        <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                            <Input value={formData.accountHolderName} onChange={e => update("accountHolderName", e.target.value)} placeholder="Nama di kartu" className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.accountHolderName && "border-red-500")} />
                                                        </div>
                                                        <ErrMsg show={fieldErrors.accountHolderName} msg="Nama pemegang kartu wajib diisi." />
                                                    </div>
                                                </div>
                                            </Section>

                                            <Section title="Otorisasi & Masa Berlaku Autodebet KK" icon={BadgeCheck}>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mulai Berlaku *</Label>
                                                        <Input type="date" value={formData.autodebetStartDate} onChange={e => update("autodebetStartDate", e.target.value)} className={cn("h-10 rounded-lg bg-background", fieldErrors.autodebetStartDate && "border-red-500")} />
                                                        <ErrMsg show={fieldErrors.autodebetStartDate} msg="Wajib diisi." />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exp Autodebet *</Label>
                                                        <Input type="date" value={formData.autodebetEndDate} onChange={e => update("autodebetEndDate", e.target.value)} className={cn("h-10 rounded-lg bg-background", fieldErrors.autodebetEndDate && "border-red-500")} />
                                                        <p className="text-[10px] text-muted-foreground">Berbeda dengan exp fisik kartu di atas</p>
                                                        <ErrMsg show={fieldErrors.autodebetEndDate} msg="Tanggal exp wajib diisi." />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">No. Referensi Otorisasi</Label>
                                                        <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                            <Input value={formData.autodebetMandateRef} onChange={e => update("autodebetMandateRef", e.target.value)} placeholder="AUT-XXXX-XXXX" className="h-10 rounded-lg bg-background pl-9" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Tagih Tiap Periode</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">Tgl.</span>
                                                            <Input type="number" min={1} max={28} value={formData.billingCycleDay} onChange={e => update("billingCycleDay", e.target.value)} placeholder="15" className="h-10 rounded-lg bg-background pl-10" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </Section>
                                        </>
                                    )}

                                    {formData.paymentMethod === "VIRTUAL_ACCOUNT" && (
                                        <Section title="Detail Virtual Account" icon={Hash}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank VA *</Label>
                                                    <Input value={formData.bankName} onChange={e => update("bankName", e.target.value)} placeholder="Contoh: BCA, Mandiri, BRI" className={cn("h-10 rounded-lg bg-background", fieldErrors.bankName && "border-red-500")} />
                                                    <ErrMsg show={fieldErrors.bankName} msg="Bank VA wajib diisi." />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomor Virtual Account *</Label>
                                                    <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                        <Input value={formData.virtualAccountNumber} onChange={e => update("virtualAccountNumber", e.target.value)} placeholder="Nomor VA" className={cn("h-10 rounded-lg bg-background pl-9 tracking-widest", fieldErrors.virtualAccountNumber && "border-red-500")} />
                                                    </div>
                                                    <ErrMsg show={fieldErrors.virtualAccountNumber} msg="Nomor VA wajib diisi." />
                                                </div>
                                            </div>
                                        </Section>
                                    )}
                                </div>
                            )}

                            {/* ════════ STEP 5: Data Klien ════════ */}
                            {currentStep === 5 && (
                                <div className="space-y-5 pb-4">
                                    <div className="mb-2">
                                        <h2 className="text-lg font-semibold">Data Pribadi Nasabah</h2>
                                        <p className="text-sm text-muted-foreground">Identitas pemegang polis dan alamat domisili.</p>
                                    </div>

                                    {/* Identitas */}
                                    <Section title="Identitas Pemegang Polis" icon={User}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Lengkap *</Label>
                                                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input value={formData.fullName} onChange={e => update("fullName", e.target.value)} placeholder="Nama sesuai KTP" className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.fullName && "border-red-500")} />
                                                </div>
                                                <ErrMsg show={fieldErrors.fullName} msg="Nama wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIK *</Label>
                                                <div className="relative"><CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input value={formData.nik} onChange={e => update("nik", e.target.value)} placeholder="16 digit NIK" maxLength={16} className={cn("h-10 rounded-lg bg-background pl-9 tracking-widest", fieldErrors.nik && "border-red-500")} />
                                                </div>
                                                <ErrMsg show={fieldErrors.nik} msg="NIK wajib diisi (16 digit)." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Nomor Paspor <span className="normal-case text-[10px] text-gray-400 ml-1">(opsional, sering diminta asuransi)</span>
                                                </Label>
                                                <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input value={formData.passportNumber} onChange={e => update("passportNumber", e.target.value.toUpperCase())} placeholder="Contoh: A1234567" maxLength={15} className="h-10 rounded-lg bg-background pl-9 tracking-widest uppercase" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email *</Label>
                                                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input type="email" value={formData.email} onChange={e => update("email", e.target.value)} placeholder="email@contoh.com" className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.email && "border-red-500")} />
                                                </div>
                                                <ErrMsg show={fieldErrors.email} msg="Email wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomor Telepon *</Label>
                                                <PhoneInput value={formData.phoneNumber} onChange={v => { update("phoneNumber", v); }} className={cn("h-10 rounded-lg", fieldErrors.phoneNumber && "border-red-500")} />
                                                <ErrMsg show={fieldErrors.phoneNumber} msg="Nomor telepon wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Lahir *</Label>
                                                <Input type="date" value={formData.birthDate} onChange={e => update("birthDate", e.target.value)} className={cn("h-10 rounded-lg bg-background", fieldErrors.birthDate && "border-red-500")} />
                                                <ErrMsg show={fieldErrors.birthDate} msg="Tanggal lahir wajib diisi." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis Kelamin *</Label>
                                                <Select value={formData.gender} onValueChange={v => update("gender", v)}>
                                                    <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.gender && "border-red-500")}>
                                                        <SelectValue placeholder="Pilih jenis kelamin" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
                                                        <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <ErrMsg show={fieldErrors.gender} msg="Jenis kelamin wajib dipilih." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pekerjaan</Label>
                                                <div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input value={formData.occupation} onChange={e => update("occupation", e.target.value)} placeholder="Contoh: Karyawan Swasta" className="h-10 rounded-lg bg-background pl-9" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Pernikahan</Label>
                                                <Select value={formData.maritalStatus} onValueChange={v => update("maritalStatus", v)}>
                                                    <SelectTrigger className="h-10 rounded-lg bg-background">
                                                        <SelectValue placeholder="Pilih status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="BELUM_MENIKAH">Belum Menikah</SelectItem>
                                                        <SelectItem value="MENIKAH">Menikah</SelectItem>
                                                        <SelectItem value="CERAI">Cerai / Janda / Duda</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </Section>

                                    {/* Tertanggung */}
                                    <Section title="Tertanggung" icon={ShieldCheck}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <button
                                                onClick={() => setInsuredSameAsPolicyholder(true)}
                                                className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-all", insuredSameAsPolicyholder ? "bg-black text-white border-black" : "bg-background text-muted-foreground border-border hover:border-gray-400")}
                                            >
                                                Sama dengan Pemegang Polis
                                            </button>
                                            <button
                                                onClick={() => setInsuredSameAsPolicyholder(false)}
                                                className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-all", !insuredSameAsPolicyholder ? "bg-black text-white border-black" : "bg-background text-muted-foreground border-border hover:border-gray-400")}
                                            >
                                                Berbeda (Isi Data Tertanggung)
                                            </button>
                                        </div>
                                        {!insuredSameAsPolicyholder && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-4 border-t border-border/50">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Tertanggung *</Label>
                                                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                        <Input value={formData.insuredName} onChange={e => update("insuredName", e.target.value)} placeholder="Nama tertanggung" className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.insuredName && "border-red-500")} />
                                                    </div>
                                                    <ErrMsg show={fieldErrors.insuredName} msg="Wajib diisi." />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIK Tertanggung *</Label>
                                                    <div className="relative"><CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                        <Input value={formData.insuredNIK} onChange={e => update("insuredNIK", e.target.value)} placeholder="16 digit NIK" maxLength={16} className={cn("h-10 rounded-lg bg-background pl-9 tracking-widest", fieldErrors.insuredNIK && "border-red-500")} />
                                                    </div>
                                                    <ErrMsg show={fieldErrors.insuredNIK} msg="Wajib diisi." />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Lahir *</Label>
                                                    <Input type="date" value={formData.insuredBirthDate} onChange={e => update("insuredBirthDate", e.target.value)} className={cn("h-10 rounded-lg bg-background", fieldErrors.insuredBirthDate && "border-red-500")} />
                                                    <ErrMsg show={fieldErrors.insuredBirthDate} msg="Wajib diisi." />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis Kelamin *</Label>
                                                    <Select value={formData.insuredGender} onValueChange={v => update("insuredGender", v)}>
                                                        <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.insuredGender && "border-red-500")}>
                                                            <SelectValue placeholder="Pilih jenis kelamin" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
                                                            <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <ErrMsg show={fieldErrors.insuredGender} msg="Wajib dipilih." />
                                                </div>
                                                <div className="space-y-1.5 md:col-span-2">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hubungan dengan Pemegang Polis *</Label>
                                                    <Select value={formData.insuredRelationship} onValueChange={v => update("insuredRelationship", v)}>
                                                        <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.insuredRelationship && "border-red-500")}>
                                                            <SelectValue placeholder="Pilih hubungan" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="PASANGAN">Pasangan / Suami / Istri</SelectItem>
                                                            <SelectItem value="ANAK">Anak</SelectItem>
                                                            <SelectItem value="ORANG_TUA">Orang Tua</SelectItem>
                                                            <SelectItem value="SAUDARA">Saudara Kandung</SelectItem>
                                                            <SelectItem value="LAINNYA">Lainnya</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <ErrMsg show={fieldErrors.insuredRelationship} msg="Hubungan wajib dipilih." />
                                                </div>
                                            </div>
                                        )}
                                    </Section>

                                    {/* Alamat */}
                                    <Section title="Alamat Domisili" icon={MapPin}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span />
                                            {addressLoading && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCw className="w-3 h-3 animate-spin" /> Memuat wilayah...</span>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jalan / Gedung / No. Rumah *</Label>
                                            <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                <Input value={formData.addressStreet} onChange={e => update("addressStreet", e.target.value)} placeholder="Contoh: Jl. Sudirman No. 10, Blok A" className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.addressStreet && "border-red-500")} />
                                            </div>
                                            <ErrMsg show={fieldErrors.addressStreet} msg="Alamat wajib diisi." />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provinsi *</Label>
                                                <Select value={formData.provinceId} onValueChange={v => { update("provinceId", v); update("regencyId",""); update("districtId",""); update("villageId",""); }}>
                                                    <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.provinceId && "border-red-500")}><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
                                                    <SelectContent className="max-h-64">{provinces.map(p => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <ErrMsg show={fieldErrors.provinceId} msg="Wajib dipilih." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kabupaten / Kota *</Label>
                                                <Select value={formData.regencyId} onValueChange={v => { update("regencyId", v); update("districtId",""); update("villageId",""); }} disabled={!formData.provinceId}>
                                                    <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.regencyId && "border-red-500", !formData.provinceId && "opacity-50")}><SelectValue placeholder={formData.provinceId ? "Pilih kota/kab" : "Pilih provinsi dahulu"} /></SelectTrigger>
                                                    <SelectContent className="max-h-64">{regencies.map(r => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <ErrMsg show={fieldErrors.regencyId} msg="Wajib dipilih." />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kecamatan *</Label>
                                                <Select value={formData.districtId} onValueChange={v => { update("districtId", v); update("villageId",""); }} disabled={!formData.regencyId}>
                                                    <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.districtId && "border-red-500", !formData.regencyId && "opacity-50")}><SelectValue placeholder={formData.regencyId ? "Pilih kecamatan" : "Pilih kab/kota dahulu"} /></SelectTrigger>
                                                    <SelectContent className="max-h-64">{districts.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <ErrMsg show={fieldErrors.districtId} msg="Wajib dipilih." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kelurahan / Desa *</Label>
                                                <Select value={formData.villageId} onValueChange={v => update("villageId", v)} disabled={!formData.districtId}>
                                                    <SelectTrigger className={cn("h-10 rounded-lg bg-background", fieldErrors.villageId && "border-red-500", !formData.districtId && "opacity-50")}><SelectValue placeholder={formData.districtId ? "Pilih kelurahan" : "Pilih kecamatan dahulu"} /></SelectTrigger>
                                                    <SelectContent className="max-h-64">{villages.map(v => <SelectItem key={v.code} value={v.code}>{v.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <ErrMsg show={fieldErrors.villageId} msg="Wajib dipilih." />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kode Pos *</Label>
                                                <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input value={formData.postalCode} onChange={e => update("postalCode", e.target.value)} placeholder="12xxx" maxLength={5} className={cn("h-10 rounded-lg bg-background pl-9", fieldErrors.postalCode && "border-red-500")} />
                                                </div>
                                                <ErrMsg show={fieldErrors.postalCode} msg="Kode pos wajib diisi." />
                                            </div>
                                        </div>
                                    </Section>
                                </div>
                            )}

                            {/* ════════ STEP 6: Konfirmasi ════════ */}
                            {currentStep === 6 && (
                                <div className="flex flex-col items-center space-y-8 py-8 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                        className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center shadow-2xl"
                                    >
                                        <ShieldCheck className="w-10 h-10" />
                                    </motion.div>
                                    <div className="space-y-1 max-w-md">
                                        <h3 className="text-2xl font-bold">Konfirmasi & Simpan</h3>
                                        <p className="text-muted-foreground text-sm">Pastikan semua data sudah benar sebelum disimpan.</p>
                                    </div>

                                    <div className="w-full max-w-3xl bg-muted/20 rounded-xl p-6 text-left space-y-5 border border-border/50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Data Klien */}
                                            <div className="space-y-3">
                                                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b pb-2">Data Klien</h4>
                                                {[
                                                    ["Nama", formData.fullName],
                                                    ["NIK", formData.nik],
                                                    ["Lahir", formData.birthDate ? new Date(formData.birthDate).toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" }) : "—"],
                                                    ["Kontak", `${formData.email} | ${formData.phoneNumber}`],
                                                    ["Pekerjaan", formData.occupation || "—"],
                                                ].map(([l, v]) => (
                                                    <div key={l}><span className="text-[11px] text-muted-foreground block">{l}</span><span className="font-medium text-sm">{v}</span></div>
                                                ))}
                                                {!insuredSameAsPolicyholder && (
                                                    <div><span className="text-[11px] text-muted-foreground block">Tertanggung</span><span className="font-medium text-sm">{formData.insuredName} ({formData.insuredRelationship})</span></div>
                                                )}
                                            </div>

                                            {/* Data Polis */}
                                            <div className="space-y-3">
                                                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b pb-2">Data Polis</h4>
                                                {[
                                                    ["No. Polis", formData.policyNumber],
                                                    ["Produk", `${formData.productName} — ${formData.insuranceCompany}`],
                                                    ["Jenis", formData.policyType],
                                                    ["Periode", `${formData.startDate ? new Date(formData.startDate).toLocaleDateString("id-ID") : "—"} s/d ${formData.endDate ? new Date(formData.endDate).toLocaleDateString("id-ID") : "—"}`],
                                                    ["Jatuh Tempo", `Tgl. ${formData.dueDay} setiap periode${formData.nextDueDate ? ` (Next: ${new Date(formData.nextDueDate).toLocaleDateString("id-ID")})` : ""}`],
                                                    ["Masa Tenggang", `${formData.gracePeriodDays || 0} hari`],
                                                    ["Status", formData.policyStatus],
                                                    ["Frekuensi", freqLabel[formData.premiumFrequency] || formData.premiumFrequency],
                                                    ["UP / Jiwa", idrFmt(formData.sumInsured)],
                                                ].map(([l, v]) => (
                                                    <div key={l}><span className="text-[11px] text-muted-foreground block">{l}</span><span className="font-medium text-sm">{v}</span></div>
                                                ))}
                                                <div className="pt-2 border-t">
                                                    <span className="text-[11px] text-muted-foreground block">Premi</span>
                                                    <span className="font-bold text-base text-emerald-600">{idrFmt(formData.premiumAmount)}</span>
                                                </div>
                                            </div>

                                            {/* Manfaat */}
                                            <div className="space-y-3">
                                                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b pb-2">Manfaat</h4>
                                                <div><span className="text-[11px] text-muted-foreground block">Area / Plan</span><span className="font-medium text-sm">{formData.coverageArea}{formData.roomPlan ? ` — ${formData.roomPlan}` : ""}</span></div>
                                                {formData.annualLimit && <div><span className="text-[11px] text-muted-foreground block">Limit Tahunan</span><span className="font-medium text-sm">{idrFmt(formData.annualLimit)}</span></div>}
                                                {formData.benefitLife && <div><span className="text-[11px] text-muted-foreground block">Jiwa</span><span className="font-medium text-sm">{idrFmt(formData.benefitLife)}</span></div>}
                                                {formData.benefitAccidentalDeath && <div><span className="text-[11px] text-muted-foreground block">Kecelakaan (ADB)</span><span className="font-medium text-sm">{idrFmt(formData.benefitAccidentalDeath)}</span></div>}
                                                {formData.benefitHospitalization && <div><span className="text-[11px] text-muted-foreground block">Rawat Inap/Hari</span><span className="font-medium text-sm">{idrFmt(formData.benefitHospitalization)}</span></div>}
                                                {formData.benefitIcu && <div><span className="text-[11px] text-muted-foreground block">ICU/Hari</span><span className="font-medium text-sm">{idrFmt(formData.benefitIcu)}</span></div>}
                                                {formData.benefitSurgery && <div><span className="text-[11px] text-muted-foreground block">Pembedahan</span><span className="font-medium text-sm">{idrFmt(formData.benefitSurgery)}</span></div>}
                                                {formData.benefitOutpatient && <div><span className="text-[11px] text-muted-foreground block">Rawat Jalan</span><span className="font-medium text-sm">{idrFmt(formData.benefitOutpatient)}</span></div>}
                                                {formData.benefitMaternity && <div><span className="text-[11px] text-muted-foreground block">Melahirkan</span><span className="font-medium text-sm">{idrFmt(formData.benefitMaternity)}</span></div>}
                                                {formData.benefitDental && <div><span className="text-[11px] text-muted-foreground block">Gigi</span><span className="font-medium text-sm">{idrFmt(formData.benefitDental)}</span></div>}
                                                {formData.benefitOptical && <div><span className="text-[11px] text-muted-foreground block">Kacamata</span><span className="font-medium text-sm">{idrFmt(formData.benefitOptical)}</span></div>}
                                                {formData.benefitDisability && <div><span className="text-[11px] text-muted-foreground block">Cacat Tetap</span><span className="font-medium text-sm">{idrFmt(formData.benefitDisability)}</span></div>}
                                                {formData.benefitCritical && <div><span className="text-[11px] text-muted-foreground block">Penyakit Kritis</span><span className="font-medium text-sm">{idrFmt(formData.benefitCritical)}</span></div>}
                                                {riders.filter(r => r.name).length > 0 && (
                                                    <div>
                                                        <span className="text-[11px] text-muted-foreground block mb-1">Rider</span>
                                                        {riders.filter(r => r.name).map((r, i) => <p key={i} className="text-sm font-medium">{r.name}{r.coverage ? ` — ${idrFmt(r.coverage)}` : ""}</p>)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Pembayaran */}
                                            <div className="space-y-3">
                                                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b pb-2">Pembayaran</h4>
                                                <div><span className="text-[11px] text-muted-foreground block">Metode</span><span className="font-medium text-sm">{payMethodLabel[formData.paymentMethod] || "—"}</span></div>
                                                {formData.bankName && <div><span className="text-[11px] text-muted-foreground block">{formData.paymentMethod === "AUTODEBET_KK" ? "Penerbit KK" : "Bank"}</span><span className="font-medium text-sm">{formData.bankName}</span></div>}
                                                {formData.accountNumber && <div><span className="text-[11px] text-muted-foreground block">{formData.paymentMethod === "AUTODEBET_KK" ? "4 Digit Terakhir" : "No. Rekening"}</span><span className="font-medium text-sm">{"••••" + formData.accountNumber.slice(-4)}</span></div>}
                                                {formData.cardExpiry && <div><span className="text-[11px] text-muted-foreground block">Exp Kartu</span><span className="font-medium text-sm">{formData.cardExpiry}</span></div>}
                                                {formData.autodebetEndDate && <div><span className="text-[11px] text-muted-foreground block">Exp Autodebet</span><span className="font-medium text-sm">{new Date(formData.autodebetEndDate).toLocaleDateString("id-ID")}</span></div>}
                                                {formData.autodebetMandateRef && <div><span className="text-[11px] text-muted-foreground block">Ref. Mandat</span><span className="font-medium text-sm">{formData.autodebetMandateRef}</span></div>}
                                                <div>
                                                    <span className="text-[11px] text-muted-foreground block mb-1">Ahli Waris</span>
                                                    {beneficiaries.filter(b => b.name).map((b, i) => <p key={i} className="text-sm font-medium">{b.name} ({b.relationship}) {b.percentage ? `— ${b.percentage}%` : ""}</p>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Bottom Navigation ─────────────────────────────── */}
            <div className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-md px-8 sm:pr-48 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost" onClick={prevStep}
                        disabled={currentStep === 1 || isLoading}
                        className="h-9 px-4 text-muted-foreground hover:text-foreground rounded-xl text-sm gap-1.5"
                    >
                        <ArrowLeft className="w-4 h-4" /> Kembali
                    </Button>
                    <span className="text-xs text-muted-foreground">Langkah {currentStep} dari {STEPS.length}</span>
                </div>

                {currentStep < STEPS.length ? (
                    <Button
                        onClick={nextStep}
                        disabled={isLoading}
                        className="h-10 px-6 bg-black hover:bg-gray-900 text-white rounded-xl font-semibold text-sm gap-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Lanjut <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                ) : (
                    <LiquidButton onClick={handleSubmit} disabled={isLoading} className="px-6">
                        {isLoading ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Menyimpan...</> : <><CheckCircle2 className="mr-2 w-4 h-4" />Simpan Data</>}
                    </LiquidButton>
                )}
            </div>
        </div>
    );
}
