"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types for Address API ---
type Region = {
    code: string;
    name: string;
}

// --- Helper Functions ---
function parseNikData(nik: string) {
    if (nik.length !== 16) return null;

    const dayCode = parseInt(nik.substring(6, 8));
    const monthCode = parseInt(nik.substring(8, 10));
    const yearCode = parseInt(nik.substring(10, 12));

    if (isNaN(dayCode) || isNaN(monthCode) || isNaN(yearCode)) return null;

    let gender = "LAKI-LAKI";
    let day = dayCode;

    // Female check
    if (dayCode > 40) {
        gender = "PEREMPUAN";
        day = dayCode - 40;
    }

    const currentYearShort = new Date().getFullYear() % 100;
    const yearPrefix = yearCode > currentYearShort ? "19" : "20"; // Simple century logic
    const fullYear = `${yearPrefix}${yearCode.toString().padStart(2, '0')}`;
    const birthDate = `${fullYear}-${monthCode.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    return { gender, birthDate };
}

export default function AgentRegisterPage() {
    const router = useRouter();
    // Form State
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        fullName: "",
        nik: "",
        phoneNumber: "",
        birthDate: "",
        gender: "LAKI-LAKI",
        addressStreet: "",
        provinceId: "",
        regencyId: "",
        districtId: "",
        villageId: "",
        postalCode: "",
    });

    // UI State
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nikValidation, setNikValidation] = useState<{ valid: boolean, message?: string }>({ valid: true });

    // Address Data State
    const [provinces, setProvinces] = useState<Region[]>([]);
    const [regencies, setRegencies] = useState<Region[]>([]);
    const [districts, setDistricts] = useState<Region[]>([]);
    const [villages, setVillages] = useState<Region[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);

    // --- Address Fetching (Local API) ---
    useEffect(() => {
        fetch("/api/wilayah/provinces")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setProvinces(data);
                else console.error("Invalid provinces data", data);
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


    // --- NIK Validation Logic ---
    useEffect(() => {
        if (formData.nik.length === 16) {
            const parsed = parseNikData(formData.nik);
            if (parsed) {
                let isValid = true;
                let msg = "";
                // Gender check
                if (formData.gender !== parsed.gender) {
                    isValid = false;
                    msg = `Jenis kelamin tidak sesuai NIK (${parsed.gender})`;
                }
                // Date check
                if (formData.birthDate !== parsed.birthDate) {
                    isValid = false;
                    msg = isValid ? `Tanggal lahir tidak sesuai NIK (${parsed.birthDate})` : msg + ", Tanggal lahir salah";
                }
                setNikValidation({ valid: isValid, message: msg });
            } else {
                setNikValidation({ valid: false, message: "Format NIK tidak valid" });
            }
        } else if (formData.nik.length > 0) {
            setNikValidation({ valid: false, message: "NIK harus 16 digit" });
        } else {
            setNikValidation({ valid: true });
        }
    }, [formData.nik, formData.birthDate, formData.gender]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        if (!nikValidation.valid) {
            setError("Mohon perbaiki data agar sesuai dengan NIK.");
            setLoading(false);
            return;
        }

        const provName = provinces.find(p => p.code === formData.provinceId)?.name || "";
        const regName = regencies.find(r => r.code === formData.regencyId)?.name || "";
        const distName = districts.find(d => d.code === formData.districtId)?.name || "";
        const villName = villages.find(v => v.code === formData.villageId)?.name || "";

        const fullAddress = `${formData.addressStreet}, ${villName}, ${distName}, ${regName}, ${provName} ${formData.postalCode}`;

        let formattedPhone = formData.phoneNumber.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
        }
        formattedPhone = '+' + formattedPhone;

        const finalBody = {
            email: formData.email,
            password: formData.password,
            role: "agent",
            fullName: formData.fullName,
            nik: formData.nik,
            phoneNumber: formattedPhone,
            address: fullAddress, // Sending combined address
            birthDate: formData.birthDate,
            gender: formData.gender,
        };

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalBody),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error ?? "Pendaftaran gagal");
                return;
            }

            setMessage("Pendaftaran berhasil! Akun Anda sedang ditinjau. Anda akan dialihkan...");

            setTimeout(() => {
                router.push("/agent/login");
            }, 2000);

            window.scrollTo(0, 0);

        } catch (err) {
            console.error(err);
            setError("Terjadi kesalahan saat pendaftaran.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 md:p-12">
            <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header - Left Aligned */}
                <div className="space-y-2 text-left w-full border-b pb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Mulai Bergabung dengan Asistenqu</h1>
                    <p className="text-muted-foreground">
                        Lengkapi formulir di bawah ini untuk memulai karir Anda sebagai agen profesional.
                    </p>
                </div>

                <div className="space-y-8">
                    {/* Alerts */}
                    {message && !error && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-50/50 p-4 text-emerald-600 animate-in slide-in-from-top-2">
                            <CheckCircle2 className="h-5 w-5" />
                            <p className="text-sm font-medium">{message}</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-50/50 p-4 text-red-600 animate-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form className="space-y-8" onSubmit={handleSubmit}>

                        {/* Account Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Informasi Akun</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Aktif</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="nama@email.com"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Kata Sandi</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Minimal 8 karakter"
                                        className="h-11"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Data Pribadi</h3>
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nama Lengkap (Sesuai KTP)</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="h-11 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label htmlFor="nik">NIK</Label>
                                        {!nikValidation.valid && <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {nikValidation.message}</span>}
                                        {nikValidation.valid && formData.nik.length === 16 && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid</span>}
                                    </div>
                                    <Input
                                        id="nik"
                                        name="nik"
                                        value={formData.nik}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val.length <= 16) handleChange({ ...e, target: { ...e.target, name: 'nik', value: val } });
                                        }}
                                        className={cn("h-11", !nikValidation.valid && "border-red-500 ring-red-500")}
                                        placeholder="16 Digit NIK"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Nomor Telepon / WhatsApp</Label>
                                    <Input
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        type="tel"
                                        required
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">Tanggal Lahir</Label>
                                    <Input
                                        id="birthDate"
                                        name="birthDate"
                                        type="date"
                                        required
                                        value={formData.birthDate}
                                        onChange={handleChange}
                                        className={cn("h-11", !nikValidation.valid && nikValidation.message?.includes("Tanggal") && "border-red-500")}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Jenis Kelamin</Label>
                                    <div className="relative">
                                        <Select
                                            name="gender"
                                            value={formData.gender}
                                            onValueChange={(value) => handleChange({ target: { name: 'gender', value } } as any)}
                                        >
                                            <SelectTrigger id="gender" className={cn("h-11 w-full", !nikValidation.valid && nikValidation.message?.includes("kelamin") && "border-red-500")}>
                                                <SelectValue placeholder="Pilih Jenis Kelamin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
                                                <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Address Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                                Alamat Domisili
                                {addressLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="addressStreet">Nama Jalan / Gedung / No. Rumah</Label>
                                <Input
                                    id="addressStreet"
                                    name="addressStreet"
                                    required
                                    value={formData.addressStreet}
                                    onChange={handleChange}
                                    placeholder="Contoh: Jl. Jendral Sudirman No. 10, RT 01 / RW 02"
                                    className="h-11"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="provinceId">Provinsi</Label>
                                    <div className="relative">
                                        <Select
                                            name="provinceId"
                                            value={formData.provinceId}
                                            onValueChange={(value) => handleChange({ target: { name: 'provinceId', value } } as any)}
                                        >
                                            <SelectTrigger id="provinceId" className="h-11 w-full">
                                                <SelectValue placeholder="Pilih Provinsi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {provinces.map(p => (
                                                    <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="regencyId">Kabupaten / Kota</Label>
                                    <div className="relative">
                                        <Select
                                            name="regencyId"
                                            value={formData.regencyId}
                                            onValueChange={(value) => handleChange({ target: { name: 'regencyId', value } } as any)}
                                            disabled={!formData.provinceId}
                                        >
                                            <SelectTrigger id="regencyId" className="h-11 w-full">
                                                <SelectValue placeholder="Pilih Kabupaten/Kota" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {regencies.map(r => (
                                                    <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="districtId">Kecamatan</Label>
                                    <div className="relative">
                                        <Select
                                            name="districtId"
                                            value={formData.districtId}
                                            onValueChange={(value) => handleChange({ target: { name: 'districtId', value } } as any)}
                                            disabled={!formData.regencyId}
                                        >
                                            <SelectTrigger id="districtId" className="h-11 w-full">
                                                <SelectValue placeholder="Pilih Kecamatan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {districts.map(d => (
                                                    <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="villageId">Kelurahan / Desa</Label>
                                    <div className="relative">
                                        <Select
                                            name="villageId"
                                            value={formData.villageId}
                                            onValueChange={(value) => handleChange({ target: { name: 'villageId', value } } as any)}
                                            disabled={!formData.districtId}
                                        >
                                            <SelectTrigger id="villageId" className="h-11 w-full">
                                                <SelectValue placeholder="Pilih Kelurahan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {villages.map(v => (
                                                    <SelectItem key={v.code} value={v.code}>{v.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postalCode">Kode Pos</Label>
                                    <Input
                                        id="postalCode"
                                        name="postalCode"
                                        value={formData.postalCode}
                                        onChange={handleChange}
                                        placeholder="12xxx"
                                        className="h-11"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold" disabled={loading || !nikValidation.valid}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Memproses Pendaftaran...
                                    </>
                                ) : "Kirim Pendaftaran"}
                            </Button>
                        </div>
                    </form>

                    <p className="text-center text-muted-foreground">
                        Sudah memiliki akun?{" "}
                        <Link href="/agent/login" className="font-semibold text-primary hover:underline">
                            Masuk Sekarang
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
