"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Upload, FileText, User, ShieldCheck, Loader2, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
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

type Region = {
    code: string;
    name: string;
}

const steps: Step[] = [
    { id: 1, title: "Upload Polis", description: "Unggah", icon: Upload },
    { id: 2, title: "Review Data", description: "Cek Data", icon: FileText },
    { id: 3, title: "Data Klien", description: "Data Diri", icon: User },
    { id: 4, title: "Konfirmasi", description: "Selesai", icon: ShieldCheck },
];

export default function NewClientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // Address Data State
    const [provinces, setProvinces] = useState<Region[]>([]);
    const [regencies, setRegencies] = useState<Region[]>([]);
    const [districts, setDistricts] = useState<Region[]>([]);
    const [villages, setVillages] = useState<Region[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState({
        // Policy Data
        policyNumber: "",
        insuranceCompany: "",
        productName: "",
        startDate: "",
        endDate: "",
        sumInsured: "",
        premiumAmount: "",
        
        // Client Data
        fullName: "",
        nik: "",
        birthDate: "",
        gender: "",
        phoneNumber: "",
        email: "",
        
        // Address Data
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

    // --- Address Fetching ---
    useEffect(() => {
        fetch("/api/wilayah/provinces")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setProvinces(data);
            })
            .catch(err => console.error("Failed to load provinces", err));
    }, []);

    useEffect(() => {
        if (!formData.provinceId) {
            setRegencies([]);
            return;
        }
        setAddressLoading(true);
        fetch(`/api/wilayah/regencies?province_code=${formData.provinceId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setRegencies(data);
                setAddressLoading(false);
            })
            .catch(err => {
                console.error(err);
                setAddressLoading(false);
            });
    }, [formData.provinceId]);

    useEffect(() => {
        if (!formData.regencyId) {
            setDistricts([]);
            return;
        }
        setAddressLoading(true);
        fetch(`/api/wilayah/districts?regency_code=${formData.regencyId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setDistricts(data);
                setAddressLoading(false);
            })
            .catch(err => {
                console.error(err);
                setAddressLoading(false);
            });
    }, [formData.regencyId]);

    useEffect(() => {
        if (!formData.districtId) {
            setVillages([]);
            return;
        }
        setAddressLoading(true);
        fetch(`/api/wilayah/villages?district_code=${formData.districtId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setVillages(data);
                setAddressLoading(false);
            })
            .catch(err => {
                console.error(err);
                setAddressLoading(false);
            });
    }, [formData.districtId]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setAiError(null);
            
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
                setFormData(prev => ({ ...prev, policyFileBase64: reader.result as string }));
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleParsePolicy = async () => {
        if (!file) return;

        setIsLoading(true);
        setAiError(null);
        const formDataPayload = new FormData();
        formDataPayload.append("file", file);

        try {
            const res = await fetch("/api/agent/parse-policy", {
                method: "POST",
                body: formDataPayload,
            });

            const data = await res.json();

            if (res.ok && data.data) {
                const parsed = data.data;
                
                if (parsed.is_valid_policy === false) {
                    setAiError("Dokumen ini sepertinya bukan polis asuransi. Silakan unggah dokumen yang benar.");
                    toast({ 
                        title: "Dokumen Tidak Valid", 
                        description: "Mohon unggah foto atau PDF polis asuransi.", 
                        variant: "destructive" 
                    });
                    setIsLoading(false);
                    return;
                }

                setFormData(prev => ({
                    ...prev,
                    policyNumber: parsed.policy_number || "",
                    insuranceCompany: parsed.insurance_company || "",
                    productName: parsed.product_name || "",
                    startDate: parsed.start_date || "",
                    endDate: parsed.end_date || "",
                    sumInsured: parsed.sum_insured?.toString() || "",
                    premiumAmount: parsed.premium_amount?.toString() || "",
                    fullName: parsed.policy_holder_name || "",
                }));
                toast({ title: "Scan Berhasil", description: "Data berhasil dibaca." });
                setCurrentStep(2);
            } else {
                toast({ 
                    title: "Gagal Membaca Dokumen", 
                    description: "AI tidak dapat membaca data dari dokumen ini. Pastikan gambar jelas.", 
                    variant: "destructive" 
                });
            }
        } catch (error) {
            console.error(error);
            toast({ 
                title: "Gagal Memproses", 
                description: "Terjadi kesalahan saat memproses dokumen. Silakan coba lagi.", 
                variant: "destructive" 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        
        // Construct full address
        const provName = provinces.find(p => p.code === formData.provinceId)?.name || "";
        const regName = regencies.find(r => r.code === formData.regencyId)?.name || "";
        const distName = districts.find(d => d.code === formData.districtId)?.name || "";
        const villName = villages.find(v => v.code === formData.villageId)?.name || "";

        const fullAddress = `${formData.addressStreet}, ${villName}, ${distName}, ${regName}, ${provName} ${formData.postalCode}`;

        // Format phone number to E.164
        let formattedPhone = formData.phoneNumber.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
        }
        if (!formattedPhone.startsWith('+')) {
             formattedPhone = '+' + formattedPhone;
        }

        try {
            const res = await fetch("/api/agent/clients/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    phoneNumber: formattedPhone,
                    address: fullAddress
                }),
            });

            if (res.ok) {
                toast({ title: "Berhasil", description: "Data klien dan polis berhasil disimpan." });
                router.push("/agent/clients"); 
            } else {
                const data = await res.json();
                toast({ 
                    title: "Gagal Menyimpan Data", 
                    description: data.error || "Terjadi kesalahan saat menyimpan data.", 
                    variant: "destructive" 
                });
            }
        } catch (error) {
            console.error(error);
            toast({ 
                title: "Kesalahan Sistem", 
                description: "Terjadi gangguan pada server. Silakan coba beberapa saat lagi.", 
                variant: "destructive" 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    const validateStep = (step: number) => {
        const newErrors: Record<string, boolean> = {};
        let isValid = true;

        if (step === 2) {
            const fields = ['policyNumber', 'insuranceCompany', 'productName', 'startDate', 'endDate', 'sumInsured', 'premiumAmount'];
            fields.forEach(field => {
                if (!formData[field as keyof typeof formData]) {
                    newErrors[field] = true;
                    isValid = false;
                }
            });
        }
        if (step === 3) {
             const fields = ['fullName', 'nik', 'birthDate', 'gender', 'phoneNumber', 'email', 'addressStreet', 'provinceId', 'regencyId', 'districtId', 'villageId', 'postalCode'];
             fields.forEach(field => {
                if (!formData[field as keyof typeof formData]) {
                    newErrors[field] = true;
                    isValid = false;
                }
            });
        }

        setFieldErrors(newErrors);

        if (!isValid) {
             toast({ 
                 title: "Data Belum Lengkap", 
                 description: "Mohon isi semua kolom yang berwarna merah sebelum melanjutkan.", 
                 variant: "destructive" 
             });
        }
        return isValid;
    };

    const nextStep = () => {
        if (currentStep === 1 && file) {
            handleParsePolicy();
        } else if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
        }
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-1">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Tambah Klien Baru</h1>
                <p className="text-muted-foreground mt-1">
                    Unggah dokumen polis untuk isi data otomatis.
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
                        {/* Step 1: Upload */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div 
                                    className={cn(
                                        "flex flex-col items-center justify-center space-y-6 py-16 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-muted/5 hover:bg-muted/10",
                                        aiError ? "border-red-500 bg-red-50/10" : "border-muted-foreground/25 hover:border-black/50"
                                    )}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*,.pdf" 
                                        onChange={handleFileChange}
                                    />
                                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center shadow-inner">
                                        <Upload className="w-10 h-10 text-muted-foreground" />
                                    </div>
                                    <div className="text-center space-y-2 px-4">
                                        <h3 className="text-xl font-semibold">Unggah Polis</h3>
                                        <p className="text-muted-foreground max-w-md mx-auto">
                                            Klik atau geser file ke sini (PDF, JPG, PNG).
                                        </p>
                                    </div>
                                    {file && (
                                        <div className="flex items-center gap-3 bg-white border px-4 py-3 rounded-lg shadow-sm mt-4">
                                            <div className="bg-emerald-100 p-2 rounded-full">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-medium text-foreground">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {aiError && (
                                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                        <p className="text-sm font-medium">{aiError}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Review Policy Data */}
                        {currentStep === 2 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h3 className="text-xl font-semibold flex items-center gap-2">
                                        <FileText className="w-5 h-5" /> Informasi Polis
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nomor Polis</Label>
                                            <Input 
                                                value={formData.policyNumber} 
                                                onChange={(e) => {
                                                    setFormData({...formData, policyNumber: e.target.value});
                                                    if (fieldErrors.policyNumber) setFieldErrors({...fieldErrors, policyNumber: false});
                                                }}
                                                className={cn("bg-transparent", fieldErrors.policyNumber && "border-red-500 focus-visible:ring-red-500")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Perusahaan Asuransi</Label>
                                            <Input 
                                                value={formData.insuranceCompany} 
                                                onChange={(e) => {
                                                    setFormData({...formData, insuranceCompany: e.target.value});
                                                    if (fieldErrors.insuranceCompany) setFieldErrors({...fieldErrors, insuranceCompany: false});
                                                }}
                                                className={cn("bg-transparent", fieldErrors.insuranceCompany && "border-red-500 focus-visible:ring-red-500")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Nama Produk</Label>
                                            <Input 
                                                value={formData.productName} 
                                                onChange={(e) => {
                                                    setFormData({...formData, productName: e.target.value});
                                                    if (fieldErrors.productName) setFieldErrors({...fieldErrors, productName: false});
                                                }}
                                                className={cn("bg-transparent", fieldErrors.productName && "border-red-500 focus-visible:ring-red-500")}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-xl font-semibold flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5" /> Detail Pertanggungan
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Tanggal Mulai</Label>
                                                <Input type="date" value={formData.startDate} onChange={(e) => {
                                                    setFormData({...formData, startDate: e.target.value});
                                                    if (fieldErrors.startDate) setFieldErrors({...fieldErrors, startDate: false});
                                                }} className={cn("bg-transparent", fieldErrors.startDate && "border-red-500 focus-visible:ring-red-500")} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tanggal Berakhir</Label>
                                                <Input type="date" value={formData.endDate} onChange={(e) => {
                                                    setFormData({...formData, endDate: e.target.value});
                                                    if (fieldErrors.endDate) setFieldErrors({...fieldErrors, endDate: false});
                                                }} className={cn("bg-transparent", fieldErrors.endDate && "border-red-500 focus-visible:ring-red-500")} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Uang Pertanggungan</Label>
                                            <Input type="number" value={formData.sumInsured} onChange={(e) => {
                                                setFormData({...formData, sumInsured: e.target.value});
                                                if (fieldErrors.sumInsured) setFieldErrors({...fieldErrors, sumInsured: false});
                                            }} className={cn("bg-transparent", fieldErrors.sumInsured && "border-red-500 focus-visible:ring-red-500")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Premi</Label>
                                            <Input type="number" value={formData.premiumAmount} onChange={(e) => {
                                                setFormData({...formData, premiumAmount: e.target.value});
                                                if (fieldErrors.premiumAmount) setFieldErrors({...fieldErrors, premiumAmount: false});
                                            }} className={cn("bg-transparent", fieldErrors.premiumAmount && "border-red-500 focus-visible:ring-red-500")} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Client Data */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <User className="w-5 h-5" /> Data Pribadi Nasabah
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Nama Lengkap</Label>
                                        <Input value={formData.fullName} onChange={(e) => {
                                            setFormData({...formData, fullName: e.target.value});
                                            if (fieldErrors.fullName) setFieldErrors({...fieldErrors, fullName: false});
                                        }} className={cn("bg-transparent", fieldErrors.fullName && "border-red-500 focus-visible:ring-red-500")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>NIK</Label>
                                        <Input value={formData.nik} onChange={(e) => {
                                            setFormData({...formData, nik: e.target.value});
                                            if (fieldErrors.nik) setFieldErrors({...fieldErrors, nik: false});
                                        }} placeholder="16 digit NIK" className={cn("bg-transparent", fieldErrors.nik && "border-red-500 focus-visible:ring-red-500")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input type="email" value={formData.email} onChange={(e) => {
                                            setFormData({...formData, email: e.target.value});
                                            if (fieldErrors.email) setFieldErrors({...fieldErrors, email: false});
                                        }} className={cn("bg-transparent", fieldErrors.email && "border-red-500 focus-visible:ring-red-500")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nomor Telepon</Label>
                                        <Input type="tel" value={formData.phoneNumber} onChange={(e) => {
                                            setFormData({...formData, phoneNumber: e.target.value});
                                            if (fieldErrors.phoneNumber) setFieldErrors({...fieldErrors, phoneNumber: false});
                                        }} className={cn("bg-transparent", fieldErrors.phoneNumber && "border-red-500 focus-visible:ring-red-500")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tanggal Lahir</Label>
                                        <Input type="date" value={formData.birthDate} onChange={(e) => {
                                            setFormData({...formData, birthDate: e.target.value});
                                            if (fieldErrors.birthDate) setFieldErrors({...fieldErrors, birthDate: false});
                                        }} className={cn("bg-transparent", fieldErrors.birthDate && "border-red-500 focus-visible:ring-red-500")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Jenis Kelamin</Label>
                                        <Select value={formData.gender} onValueChange={(val) => {
                                            setFormData({...formData, gender: val});
                                            if (fieldErrors.gender) setFieldErrors({...fieldErrors, gender: false});
                                        }}>
                                            <SelectTrigger className={cn("bg-transparent", fieldErrors.gender && "border-red-500 focus:ring-red-500")}>
                                                <SelectValue placeholder="Pilih Jenis Kelamin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
                                                <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    {/* Address Section */}
                                    <div className="col-span-2 space-y-4 pt-2">
                                        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                            Alamat Domisili
                                            {addressLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                        </h4>
                                        <div className="space-y-2">
                                            <Label>Jalan / Gedung / No. Rumah</Label>
                                            <Input value={formData.addressStreet} onChange={(e) => {
                                                setFormData({...formData, addressStreet: e.target.value});
                                                if (fieldErrors.addressStreet) setFieldErrors({...fieldErrors, addressStreet: false});
                                            }} className={cn("bg-transparent", fieldErrors.addressStreet && "border-red-500 focus-visible:ring-red-500")} placeholder="Contoh: Jl. Sudirman No. 10" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Provinsi</Label>
                                                <Select value={formData.provinceId} onValueChange={(val) => {
                                                    setFormData({...formData, provinceId: val});
                                                    if (fieldErrors.provinceId) setFieldErrors({...fieldErrors, provinceId: false});
                                                }}>
                                                    <SelectTrigger className={cn("bg-transparent", fieldErrors.provinceId && "border-red-500 focus:ring-red-500")}>
                                                        <SelectValue placeholder="Pilih Provinsi" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {provinces.map(p => (
                                                            <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Kabupaten / Kota</Label>
                                                <Select value={formData.regencyId} onValueChange={(val) => {
                                                    setFormData({...formData, regencyId: val});
                                                    if (fieldErrors.regencyId) setFieldErrors({...fieldErrors, regencyId: false});
                                                }} disabled={!formData.provinceId}>
                                                    <SelectTrigger className={cn("bg-transparent", fieldErrors.regencyId && "border-red-500 focus:ring-red-500")}>
                                                        <SelectValue placeholder="Pilih Kota/Kab" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {regencies.map(r => (
                                                            <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Kecamatan</Label>
                                                <Select value={formData.districtId} onValueChange={(val) => {
                                                    setFormData({...formData, districtId: val});
                                                    if (fieldErrors.districtId) setFieldErrors({...fieldErrors, districtId: false});
                                                }} disabled={!formData.regencyId}>
                                                    <SelectTrigger className={cn("bg-transparent", fieldErrors.districtId && "border-red-500 focus:ring-red-500")}>
                                                        <SelectValue placeholder="Pilih Kecamatan" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {districts.map(d => (
                                                            <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Kelurahan</Label>
                                                <Select value={formData.villageId} onValueChange={(val) => {
                                                    setFormData({...formData, villageId: val});
                                                    if (fieldErrors.villageId) setFieldErrors({...fieldErrors, villageId: false});
                                                }} disabled={!formData.districtId}>
                                                    <SelectTrigger className={cn("bg-transparent", fieldErrors.villageId && "border-red-500 focus:ring-red-500")}>
                                                        <SelectValue placeholder="Pilih Kelurahan" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {villages.map(v => (
                                                            <SelectItem key={v.code} value={v.code}>{v.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Kode Pos</Label>
                                                <Input value={formData.postalCode} onChange={(e) => {
                                                    setFormData({...formData, postalCode: e.target.value});
                                                    if (fieldErrors.postalCode) setFieldErrors({...fieldErrors, postalCode: false});
                                                }} className={cn("bg-transparent", fieldErrors.postalCode && "border-red-500 focus-visible:ring-red-500")} placeholder="12xxx" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Confirmation */}
                        {currentStep === 4 && (
                            <div className="flex flex-col items-center justify-center space-y-8 py-12 text-center">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    className="w-24 h-24 rounded-full bg-black text-white flex items-center justify-center shadow-2xl"
                                >
                                    <ShieldCheck className="w-12 h-12" />
                                </motion.div>
                                <div className="space-y-2 max-w-md">
                                    <h3 className="text-3xl font-bold">Simpan Data?</h3>
                                    <p className="text-muted-foreground">
                                        Pastikan data sudah benar sebelum disimpan.
                                    </p>
                                </div>
                                
                                <div className="w-full max-w-2xl bg-muted/20 rounded-xl p-8 text-left space-y-6 border border-border/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Client Info */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Data Klien</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Nama Lengkap</span>
                                                    <span className="font-medium">{formData.fullName}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">NIK</span>
                                                    <span className="font-medium">{formData.nik}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Tanggal Lahir</span>
                                                    <span className="font-medium">{formData.birthDate ? new Date(formData.birthDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Kontak</span>
                                                    <span className="font-medium block">{formData.email}</span>
                                                    <span className="font-medium block">{formData.phoneNumber}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Alamat</span>
                                                    <span className="font-medium text-sm leading-relaxed">
                                                        {formData.addressStreet}, {
                                                            villages.find(v => v.code === formData.villageId)?.name
                                                        }, {
                                                            districts.find(d => d.code === formData.districtId)?.name
                                                        }, {
                                                            regencies.find(r => r.code === formData.regencyId)?.name
                                                        }, {
                                                            provinces.find(p => p.code === formData.provinceId)?.name
                                                        } {formData.postalCode}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Policy Info */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Data Polis</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">No. Polis</span>
                                                    <span className="font-medium">{formData.policyNumber}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Perusahaan Asuransi</span>
                                                    <span className="font-medium">{formData.insuranceCompany}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Produk</span>
                                                    <span className="font-medium">{formData.productName}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-xs text-muted-foreground block">Mulai</span>
                                                        <span className="font-medium">{formData.startDate ? new Date(formData.startDate).toLocaleDateString("id-ID") : "-"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-muted-foreground block">Berakhir</span>
                                                        <span className="font-medium">{formData.endDate ? new Date(formData.endDate).toLocaleDateString("id-ID") : "-"}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Uang Pertanggungan</span>
                                                    <span className="font-medium">Rp {parseInt(formData.sumInsured || "0").toLocaleString("id-ID")}</span>
                                                </div>
                                                <div className="pt-2 border-t mt-2">
                                                    <span className="text-xs text-muted-foreground block">Premi</span>
                                                    <span className="font-bold text-lg text-emerald-600">Rp {parseInt(formData.premiumAmount || "0").toLocaleString("id-ID")}</span>
                                                </div>
                                            </div>
                                        </div>
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
                
                {currentStep < 4 ? (
                    <Button 
                        onClick={nextStep} 
                        disabled={isLoading || (currentStep === 1 && !file)}
                        className="w-40 bg-black hover:bg-gray-900 text-white rounded-full h-12"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>
                                Lanjut
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </>
                        )}
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
                                Simpan Data
                            </>
                        )}
                    </LiquidButton>
                )}
            </div>
        </div>
    );
}
