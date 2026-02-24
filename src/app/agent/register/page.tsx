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
import { AlertCircle, CheckCircle2, Loader2, AlertTriangle, ArrowRight, Zap, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";

type Region = { code: string; name: string; }

function parseNikData(nik: string) {
    if (nik.length !== 16) return null;
    const dayCode = parseInt(nik.substring(6, 8));
    const monthCode = parseInt(nik.substring(8, 10));
    const yearCode = parseInt(nik.substring(10, 12));
    if (isNaN(dayCode) || isNaN(monthCode) || isNaN(yearCode)) return null;

    let gender = "LAKI-LAKI";
    let day = dayCode;
    if (dayCode > 40) {
        gender = "PEREMPUAN";
        day = dayCode - 40;
    }
    const currentYearShort = new Date().getFullYear() % 100;
    const yearPrefix = yearCode > currentYearShort ? "19" : "20";
    const fullYear = `${yearPrefix}${yearCode.toString().padStart(2, '0')}`;
    const birthDate = `${fullYear}-${monthCode.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return { gender, birthDate };
}

export default function AgentRegisterPage() {
    const router = useRouter();
    const { t, lang, setLang } = useTranslation();
    const [formData, setFormData] = useState({
        email: "", password: "", fullName: "", nik: "", phoneNumber: "", birthDate: "", gender: "LAKI-LAKI",
        addressStreet: "", provinceId: "", regencyId: "", districtId: "", villageId: "", postalCode: "", agencyId: "",
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nikValidation, setNikValidation] = useState<{ valid: boolean, message?: string }>({ valid: true });

    const [provinces, setProvinces] = useState<Region[]>([]);
    const [regencies, setRegencies] = useState<Region[]>([]);
    const [districts, setDistricts] = useState<Region[]>([]);
    const [villages, setVillages] = useState<Region[]>([]);
    const [agencies, setAgencies] = useState<{ agency_id: string; name: string }[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);

    useEffect(() => {
        fetch("/api/wilayah/provinces").then(res => res.json()).then(data => {
            if (Array.isArray(data)) setProvinces(data);
        }).catch(err => console.error(err));

        fetch("/api/agencies").then(res => res.json()).then(data => {
            if (Array.isArray(data)) setAgencies(data);
        }).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (!formData.provinceId) { setRegencies([]); return; }
        setAddressLoading(true);
        fetch(`/api/wilayah/regencies?province_code=${formData.provinceId}`).then(res => res.json()).then(data => {
            if (Array.isArray(data)) setRegencies(data); setAddressLoading(false);
        }).catch(() => setAddressLoading(false));
    }, [formData.provinceId]);

    useEffect(() => {
        if (!formData.regencyId) { setDistricts([]); return; }
        setAddressLoading(true);
        fetch(`/api/wilayah/districts?regency_code=${formData.regencyId}`).then(res => res.json()).then(data => {
            if (Array.isArray(data)) setDistricts(data); setAddressLoading(false);
        }).catch(() => setAddressLoading(false));
    }, [formData.regencyId]);

    useEffect(() => {
        if (!formData.districtId) { setVillages([]); return; }
        setAddressLoading(true);
        fetch(`/api/wilayah/villages?district_code=${formData.districtId}`).then(res => res.json()).then(data => {
            if (Array.isArray(data)) setVillages(data); setAddressLoading(false);
        }).catch(() => setAddressLoading(false));
    }, [formData.districtId]);

    useEffect(() => {
        if (formData.nik.length === 16) {
            const parsed = parseNikData(formData.nik);
            if (parsed) {
                let isValid = true;
                let msg = "";
                if (formData.gender !== parsed.gender) {
                    isValid = false;
                    msg = lang === 'en' ? `Gender doesn't match NIK (${parsed.gender})` : `Jenis kelamin tidak sesuai NIK (${parsed.gender})`;
                }
                if (formData.birthDate !== parsed.birthDate) {
                    isValid = false;
                    msg = isValid ? (lang === 'en' ? `Birth date doesn't match NIK (${parsed.birthDate})` : `Tanggal lahir tidak sesuai NIK (${parsed.birthDate})`) : msg + (lang === 'en' ? ", Wrong birth date" : ", Tanggal lahir salah");
                }
                setNikValidation({ valid: isValid, message: msg });
            } else {
                setNikValidation({ valid: false, message: lang === 'en' ? "Invalid NIK format" : "Format NIK tidak valid" });
            }
        } else if (formData.nik.length > 0) {
            setNikValidation({ valid: false, message: lang === 'en' ? "NIK must be 16 digits" : "NIK harus 16 digit" });
        } else {
            setNikValidation({ valid: true });
        }
    }, [formData.nik, formData.birthDate, formData.gender, lang]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    const validateForm = () => {
        const newErrors: Record<string, boolean> = {};
        let isValid = true;
        const fields = ['email', 'password', 'fullName', 'nik', 'phoneNumber', 'birthDate', 'gender', 'addressStreet', 'provinceId', 'regencyId', 'districtId', 'villageId', 'postalCode', 'agencyId'];
        fields.forEach(field => {
            if (!formData[field as keyof typeof formData]) {
                newErrors[field] = true;
                isValid = false;
            }
        });
        setFieldErrors(newErrors);
        if (!isValid) setError(lang === 'en' ? "Please complete highlighted fields." : "Mohon lengkapi kolom yang ditandai merah.");
        return isValid;
    };

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true); setMessage(null); setError(null);

        if (!validateForm()) { setLoading(false); return; }
        if (!nikValidation.valid) {
            setError(lang === 'en' ? "Please fix data to match NIK." : "Mohon perbaiki data agar sesuai dengan NIK.");
            setLoading(false); return;
        }

        const provName = provinces.find(p => p.code === formData.provinceId)?.name || "";
        const regName = regencies.find(r => r.code === formData.regencyId)?.name || "";
        const distName = districts.find(d => d.code === formData.districtId)?.name || "";
        const villName = villages.find(v => v.code === formData.villageId)?.name || "";
        const fullAddress = `${formData.addressStreet}, ${villName}, ${distName}, ${regName}, ${provName} ${formData.postalCode}`;

        let formattedPhone = formData.phoneNumber.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
        formattedPhone = '+' + formattedPhone;

        const finalBody = {
            email: formData.email, password: formData.password, role: "agent", fullName: formData.fullName, nik: formData.nik, phoneNumber: formattedPhone, address: fullAddress, birthDate: formData.birthDate, gender: formData.gender, agencyId: formData.agencyId,
        };

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(finalBody),
            });
            if (!response.ok) {
                const data = await response.json();
                setError(data.error ?? (lang === 'en' ? "Registration failed" : "Pendaftaran gagal"));
                return;
            }
            setMessage(lang === 'en' ? "Registration successful! Redirecting..." : "Pendaftaran berhasil! Mengalihkan...");
            setTimeout(() => { router.push("/agent/login"); }, 2000);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            setError(lang === 'en' ? "An error occurred during registration." : "Terjadi kesalahan saat pendaftaran.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-12 relative overflow-hidden">
            {/* Background Decorative */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-black/[0.02] rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            {/* Language Toggle */}
            <div className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <Globe className="w-4 h-4 text-gray-500" />
                <button onClick={() => setLang('en')} className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${lang === 'en' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}>EN</button>
                <button onClick={() => setLang('id')} className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${lang === 'id' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}>ID</button>
            </div>

            <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 bg-white p-8 sm:p-12 rounded-3xl shadow-2xl shadow-black/5 border border-white/20 my-10">

                {/* Header */}
                <div className="flex flex-col items-center text-center w-full pb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t.registerTitle}</h1>
                    <p className="text-sm text-gray-500 mt-2 max-w-md">
                        {t.registerSub}
                    </p>
                </div>

                <div className="space-y-8">
                    {message && !error && (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 animate-in zoom-in-95 duration-200">
                            <CheckCircle2 className="h-5 w-5" />
                            <p className="text-sm font-medium">{message}</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 animate-in zoom-in-95 duration-200">
                            <AlertCircle className="h-5 w-5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form className="space-y-10" onSubmit={handleSubmit}>

                        {/* Account Details */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-gray-100 text-gray-500 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                {lang === 'en' ? "Account Details" : "Informasi Akun"}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t.email}</Label>
                                    <Input id="email" name="email" type="email" required value={formData.email} onChange={(e) => { handleChange(e); if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: false }); }} placeholder="nama@email.com" className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.email && "border-red-500 focus-visible:ring-red-500")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t.password}</Label>
                                    <Input id="password" name="password" type="password" required value={formData.password} onChange={(e) => { handleChange(e); if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: false }); }} placeholder={lang === 'en' ? "Min. 8 characters" : "Minimal 8 karakter"} className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.password && "border-red-500 focus-visible:ring-red-500")} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agencyId" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "Agency" : "Agensi"}</Label>
                                <Select name="agencyId" value={formData.agencyId} onValueChange={(value) => { handleChange({ target: { name: 'agencyId', value } } as any); if (fieldErrors.agencyId) setFieldErrors({ ...fieldErrors, agencyId: false }); }}>
                                    <SelectTrigger id="agencyId" className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.agencyId && "border-red-500")}>
                                        <SelectValue placeholder={lang === 'en' ? "Select your Agency" : "Pilih Agensi Anda"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agencies.map(a => <SelectItem key={a.agency_id} value={a.agency_id}>{a.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-gray-100 text-gray-500 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                {lang === 'en' ? "Personal Data" : "Data Pribadi"}
                            </h3>
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t.fullName}</Label>
                                <Input id="fullName" name="fullName" type="text" required value={formData.fullName} onChange={(e) => { handleChange(e); if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: false }); }} className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.fullName && "border-red-500 focus-visible:ring-red-500")} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label htmlFor="nik" className="text-xs font-semibold uppercase tracking-wider text-gray-500">NIK (Identity Number)</Label>
                                        {!nikValidation.valid && <span className="text-xs text-red-500 flex items-center gap-1 font-medium"><AlertTriangle className="w-3 h-3" /> {nikValidation.message}</span>}
                                        {nikValidation.valid && formData.nik.length === 16 && <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium"><CheckCircle2 className="w-3 h-3" /> Valid</span>}
                                    </div>
                                    <Input id="nik" name="nik" value={formData.nik} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); if (val.length <= 16) handleChange({ ...e, target: { ...e.target, name: 'nik', value: val } }); if (fieldErrors.nik) setFieldErrors({ ...fieldErrors, nik: false }); }} className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", (!nikValidation.valid || fieldErrors.nik) && "border-red-500 ring-red-500")} placeholder="16 Digit" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "Phone Number" : "Nomor HP / WhatsApp"}</Label>
                                    <Input id="phoneNumber" name="phoneNumber" type="tel" required value={formData.phoneNumber} onChange={(e) => { handleChange(e); if (fieldErrors.phoneNumber) setFieldErrors({ ...fieldErrors, phoneNumber: false }); }} className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.phoneNumber && "border-red-500 focus-visible:ring-red-500")} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "Birth Date" : "Tanggal Lahir"}</Label>
                                    <Input id="birthDate" name="birthDate" type="date" required value={formData.birthDate} onChange={(e) => { handleChange(e); if (fieldErrors.birthDate) setFieldErrors({ ...fieldErrors, birthDate: false }); }} className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", ((!nikValidation.valid && nikValidation.message?.includes("Tanggal")) || fieldErrors.birthDate) && "border-red-500")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "Gender" : "Jenis Kelamin"}</Label>
                                    <Select name="gender" value={formData.gender} onValueChange={(value) => { handleChange({ target: { name: 'gender', value } } as any); if (fieldErrors.gender) setFieldErrors({ ...fieldErrors, gender: false }); }}>
                                        <SelectTrigger id="gender" className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", ((!nikValidation.valid && nikValidation.message?.toLowerCase().includes("kelamin")) || fieldErrors.gender) && "border-red-500")}>
                                            <SelectValue placeholder="Pilih Jenis Kelamin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LAKI-LAKI">{lang === 'en' ? "Male" : "Laki-laki"}</SelectItem>
                                            <SelectItem value="PEREMPUAN">{lang === 'en' ? "Female" : "Perempuan"}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Address Details */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-gray-100 text-gray-500 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                {lang === 'en' ? "Address" : "Alamat Domisili"}
                                {addressLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="addressStreet" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "Street / House No." : "Jalan / No. Rumah"}</Label>
                                <Input id="addressStreet" name="addressStreet" required value={formData.addressStreet} onChange={(e) => { handleChange(e); if (fieldErrors.addressStreet) setFieldErrors({ ...fieldErrors, addressStreet: false }); }} className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.addressStreet && "border-red-500")} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="provinceId" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "Province" : "Provinsi"}</Label>
                                    <Select name="provinceId" value={formData.provinceId} onValueChange={(value) => { handleChange({ target: { name: 'provinceId', value } } as any); if (fieldErrors.provinceId) setFieldErrors({ ...fieldErrors, provinceId: false }); }}>
                                        <SelectTrigger id="provinceId" className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.provinceId && "border-red-500")}>
                                            <SelectValue placeholder="Pilih Provinsi" />
                                        </SelectTrigger>
                                        <SelectContent>{provinces.map(p => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="regencyId" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "City / Regency" : "Kabupaten / Kota"}</Label>
                                    <Select name="regencyId" value={formData.regencyId} onValueChange={(value) => { handleChange({ target: { name: 'regencyId', value } } as any); if (fieldErrors.regencyId) setFieldErrors({ ...fieldErrors, regencyId: false }); }} disabled={!formData.provinceId}>
                                        <SelectTrigger id="regencyId" className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.regencyId && "border-red-500")}>
                                            <SelectValue placeholder="Pilih Kabupaten/Kota" />
                                        </SelectTrigger>
                                        <SelectContent>{regencies.map(r => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="districtId" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "District" : "Kecamatan"}</Label>
                                    <Select name="districtId" value={formData.districtId} onValueChange={(value) => { handleChange({ target: { name: 'districtId', value } } as any); if (fieldErrors.districtId) setFieldErrors({ ...fieldErrors, districtId: false }); }} disabled={!formData.regencyId}>
                                        <SelectTrigger id="districtId" className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.districtId && "border-red-500")}>
                                            <SelectValue placeholder="Pilih Kecamatan" />
                                        </SelectTrigger>
                                        <SelectContent>{districts.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="villageId" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "Village" : "Kelurahan"}</Label>
                                    <Select name="villageId" value={formData.villageId} onValueChange={(value) => { handleChange({ target: { name: 'villageId', value } } as any); if (fieldErrors.villageId) setFieldErrors({ ...fieldErrors, villageId: false }); }} disabled={!formData.districtId}>
                                        <SelectTrigger id="villageId" className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.villageId && "border-red-500")}>
                                            <SelectValue placeholder="Pilih Kelurahan" />
                                        </SelectTrigger>
                                        <SelectContent>{villages.map(v => <SelectItem key={v.code} value={v.code}>{v.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postalCode" className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === 'en' ? "Postal Code" : "Kode Pos"}</Label>
                                    <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={(e) => { handleChange(e); if (fieldErrors.postalCode) setFieldErrors({ ...fieldErrors, postalCode: false }); }} className={cn("h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black", fieldErrors.postalCode && "border-red-500")} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <Button type="submit" className="w-full h-14 rounded-xl text-base font-bold bg-black hover:bg-gray-900 text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1" disabled={loading || !nikValidation.valid}>
                                {loading ? (
                                    <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> {t.loading}</>
                                ) : (
                                    <>{t.createAccount} <ArrowRight className="ml-2 w-5 h-5" /></>
                                )}
                            </Button>
                        </div>
                    </form>

                    <p className="text-center text-sm font-medium text-gray-500 mt-8">
                        {t.alreadyHaveAccount}{" "}
                        <Link href="/agent/login" className="font-bold text-black hover:underline transition-all">
                            {t.signIn}
                        </Link>
                    </p>
                </div>
            </div >
        </div >
    );
}
