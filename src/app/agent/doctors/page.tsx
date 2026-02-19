"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, MapPin, Star, Stethoscope, Building2, ChevronRight, X, Heart, Brain, Bone, Microscope, Eye, Baby, ExternalLink, Activity, Droplets, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Doctor {
    id: string
    name: string
    title: string
    specialization: string
    subspecialization?: string
    hospital: string
    hospital_location: string
    country: string
    experience_years?: number
    languages?: string[]
    notable_for?: string
    rating: number
    consultation_fee_min?: number
    consultation_fee_max?: number
    currency?: string
    is_featured: boolean
    profile_url?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPECIALIZATIONS = [
    { key: "", label: "Semua", icon: Stethoscope },
    { key: "Kardiologi", label: "Jantung", icon: Heart },
    { key: "Neurologi", label: "Saraf", icon: Brain },
    { key: "Ortopedi", label: "Tulang", icon: Bone },
    { key: "Onkologi", label: "Kanker", icon: Microscope },
    { key: "Oftalmologi", label: "Mata", icon: Eye },
    { key: "Pediatri", label: "Anak", icon: Baby },
    { key: "Gastroenterologi", label: "Pencernaan", icon: Activity },
    { key: "Urologi", label: "Urologi", icon: Droplets },
    { key: "Dermatologi", label: "Kulit", icon: FlaskConical },
    { key: "Penyakit Infeksi", label: "Infeksi", icon: FlaskConical },
]

const COUNTRIES = [
    { key: "", label: "Semua" },
    { key: "Indonesia", label: "Indonesia 🇮🇩" },
    { key: "Malaysia", label: "Malaysia 🇲🇾" },
    { key: "Singapore", label: "Singapura 🇸🇬" },
    { key: "Thailand", label: "Thailand 🇹🇭" },
    { key: "India", label: "India 🇮🇳" },
]

const CURRENCY_SYMBOL: Record<string, string> = {
    IDR: "Rp",
    MYR: "RM",
    SGD: "S$",
    THB: "฿",
    INR: "₹",
}

const COUNTRY_FLAG: Record<string, string> = {
    Indonesia: "🇮🇩",
    Malaysia: "🇲🇾",
    Singapore: "🇸🇬",
    Thailand: "🇹🇭",
    India: "🇮🇳",
}

function formatFee(min?: number, max?: number, currency?: string): string {
    if (!min || !max || !currency) return ""
    const sym = CURRENCY_SYMBOL[currency] || currency
    if (currency === "IDR") return `${sym}${(min / 1000).toFixed(0)}–${(max / 1000).toFixed(0)}rb`
    return `${sym}${min}–${max}`
}

// ─── Doctor Card — minimal, clean ────────────────────────────────────────────
function DoctorCard({ doctor }: { doctor: Doctor }) {
    const rating = parseFloat(String(doctor.rating))
    const fee = formatFee(doctor.consultation_fee_min, doctor.consultation_fee_max, doctor.currency)
    const flag = COUNTRY_FLAG[doctor.country] || ""

    return (
        <div className="group bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">

            {/* Top: name + specialization tag */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[11px] font-medium text-gray-400 truncate">{doctor.title}</p>
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug mt-0.5">{doctor.name}</h3>
                    </div>
                    {doctor.is_featured && (
                        <span className="shrink-0 text-[9px] font-bold tracking-wider uppercase text-white bg-gray-900 px-2 py-0.5 rounded-full mt-1">
                            Unggulan
                        </span>
                    )}
                </div>

                <span className="inline-flex items-center w-fit text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                    {doctor.specialization}
                    {doctor.subspecialization && (
                        <span className="text-gray-400 ml-1">· {doctor.subspecialization}</span>
                    )}
                </span>
            </div>

            {/* Notable — only if present */}
            {doctor.notable_for && (
                <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                    {doctor.notable_for}
                </p>
            )}

            {/* Hospital */}
            <div className="flex items-start gap-2 mt-auto">
                <Building2 className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-0.5" />
                <div className="min-w-0">
                    <p className="text-[12px] text-gray-700 font-medium leading-tight truncate">{doctor.hospital}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {doctor.hospital_location}
                    </p>
                </div>
            </div>

            {/* Footer: rating · exp · fee · country */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-gray-900 text-gray-900" />
                        <span className="text-xs font-bold text-gray-900">{rating.toFixed(1)}</span>
                    </div>
                    {doctor.experience_years && (
                        <span className="text-[11px] text-gray-400">{doctor.experience_years} thn</span>
                    )}
                    {fee && (
                        <span className="text-[11px] text-gray-500 font-medium">{fee}</span>
                    )}
                </div>
                <span className="text-sm">{flag}</span>
            </div>

            {/* CTA */}
            {doctor.profile_url && (
                <a
                    href={doctor.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-900 hover:text-gray-900 py-2 rounded-xl transition-all duration-150"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Lihat Profil
                </a>
            )}
        </div>
    )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse space-y-3.5">
            <div className="space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-5 bg-gray-100 rounded w-1/2 mt-1" />
            </div>
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="space-y-1 mt-3">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
            <div className="h-px bg-gray-100 mt-3" />
            <div className="flex items-center gap-3 pt-1">
                <div className="h-3 bg-gray-100 rounded w-8" />
                <div className="h-3 bg-gray-100 rounded w-12" />
                <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DoctorSearchPage() {
    const [query, setQuery] = useState("")
    const [specialization, setSpecialization] = useState("")
    const [country, setCountry] = useState("")
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [showFilters, setShowFilters] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchDoctors = useCallback(async (
        q: string, spec: string, cnt: string, pg: number
    ) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (q) params.set("q", q)
            if (spec) params.set("specialization", spec)
            if (cnt) params.set("country", cnt)
            params.set("page", pg.toString())
            params.set("limit", "24")
            const res = await fetch(`/api/doctors?${params}`)
            const data = await res.json()
            if (pg === 1) setDoctors(data.doctors || [])
            else setDoctors(prev => [...prev, ...(data.doctors || [])])
            setTotal(data.total || 0)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            setPage(1)
            fetchDoctors(query, specialization, country, 1)
        }, 300)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query, specialization, country, fetchDoctors])

    const hasActiveFilters = !!(specialization || country)
    const clearFilters = () => { setSpecialization(""); setCountry(""); setQuery(""); setPage(1) }

    const loadMore = () => {
        const next = page + 1
        setPage(next)
        fetchDoctors(query, specialization, country, next)
    }

    return (
        <div className="flex flex-col gap-5">

            {/* ── Header ── */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Direktori Dokter</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                    {total > 0 ? <><span className="font-semibold text-gray-700">{total}</span> dokter spesialis tersedia</> : "Direktori dokter spesialis regional"}
                </p>
            </div>

            {/* ── Search bar ── */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                    id="doctor-search-input"
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Cari nama, spesialisasi, atau rumah sakit..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
                />
                {query && (
                    <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* ── Specialization chips ── */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 -mb-1">
                {SPECIALIZATIONS.map(spec => {
                    const Icon = spec.icon
                    const active = specialization === spec.key
                    return (
                        <button
                            key={spec.key}
                            id={`spec-filter-${spec.key || "all"}`}
                            onClick={() => setSpecialization(prev => prev === spec.key ? "" : spec.key)}
                            className={`flex items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 rounded-lg border font-medium shrink-0 transition-all duration-150 ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"}`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {spec.label}
                        </button>
                    )
                })}
            </div>

            {/* ── Country filter + filter toggle ── */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                    {COUNTRIES.map(c => {
                        const active = country === c.key
                        return (
                            <button
                                key={c.key}
                                id={`filter-country-${c.key || "all"}`}
                                onClick={() => setCountry(prev => prev === c.key ? "" : c.key)}
                                className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-lg border font-medium shrink-0 transition-all duration-150 ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}
                            >
                                {c.label}
                            </button>
                        )
                    })}
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 font-medium transition-colors"
                    >
                        <X className="h-3.5 w-3.5" /> Reset
                    </button>
                )}
            </div>

            {/* ── Loading state ── */}
            {loading && doctors.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : doctors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                        <Search className="h-5 w-5 text-gray-300" />
                    </div>
                    <p className="font-semibold text-gray-700 text-sm">Tidak ditemukan</p>
                    <p className="text-xs text-gray-400 mt-1">Coba ubah kata kunci atau hapus filter.</p>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="mt-3 text-xs text-gray-700 font-semibold underline underline-offset-4">
                            Hapus semua filter
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {doctors.map(doctor => (
                        <DoctorCard key={doctor.id} doctor={doctor} />
                    ))}
                </div>
            )}

            {/* ── Load More ── */}
            {!loading && doctors.length < total && (
                <div className="flex justify-center py-2">
                    <Button
                        id="load-more-doctors"
                        variant="outline"
                        onClick={loadMore}
                        className="gap-2 text-xs border-gray-200 text-gray-500 hover:text-gray-800 px-8 rounded-xl"
                    >
                        Tampilkan lebih banyak <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}

        </div>
    )
}
