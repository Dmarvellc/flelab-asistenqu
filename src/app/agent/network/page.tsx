"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
  Search, Building2, MapPin, Star, Shield, Globe2, Stethoscope, ChevronRight,
  X, Heart, Brain, Bone, Microscope, Eye, Baby, Activity, Droplets, FlaskConical,
  Award, Users, Zap, Clock, Hospital, Video
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Types ──────────────────────────────────────────────────
interface NetworkHospital {
  hospital_id: string
  name: string
  country: string
  city: string
  address: string
  phone: string
  website: string | null
  type: string
  tier: string
  bed_count: number
  established_year: number
  emergency_24h: boolean
  international_patients: boolean
  insurance_panel: boolean
  is_partner: boolean
  avg_rating: number
  total_reviews: number
  description: string | null
  specializations: string[]
  accreditations: string[]
  languages_supported: string[]
  technologies: string[]
  doctor_count?: number
}

interface MarketplaceDoctor {
  id: string
  name: string
  title: string
  specialization: string
  subspecialization: string | null
  hospital: string
  hospital_location: string
  country: string
  experience_years: number
  languages: string[]
  notable_for: string | null
  rating: number
  consultation_fee_min: number
  consultation_fee_max: number
  currency: string
  is_featured: boolean
  telemedicine_available: boolean
  qualifications: string[]
  procedures_offered: string[]
  conditions_treated: string[]
  hospital_id: string | null
  hospital_count?: number
  primary_hospital_name?: string
  primary_hospital_city?: string
  primary_hospital_tier?: string
  patients_treated?: number
  total_reviews?: number
  gender?: string | null
}

interface NetworkStats {
  total_hospitals: number
  total_doctors: number
  countries: { country: string; hospital_count: number; doctor_count: number }[]
  top_specializations: { specialization: string; doctor_count: number }[]
  premium_hospitals: number
  partner_hospitals: number
  jci_accredited: number
}

// ─── Constants ──────────────────────────────────────────────
const COUNTRY_FLAG: Record<string, string> = {
  Singapore: "🇸🇬", Malaysia: "🇲🇾", Indonesia: "🇮🇩", Thailand: "🇹🇭", India: "🇮🇳",
}

const CURRENCY_SYMBOL: Record<string, string> = {
  IDR: "Rp", MYR: "RM", SGD: "S$", THB: "฿", INR: "₹",
}

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
  { key: "", label: "Semua Negara" },
  { key: "Singapore", label: "🇸🇬 Singapura" },
  { key: "Malaysia", label: "🇲🇾 Malaysia" },
  { key: "Indonesia", label: "🇮🇩 Indonesia" },
]

function formatFee(min?: number, max?: number, currency?: string): string {
  if (!min || !max || !currency) return ""
  const sym = CURRENCY_SYMBOL[currency] || currency
  if (currency === "IDR") return `${sym}${(min / 1000).toFixed(0)}–${(max / 1000).toFixed(0)}rb`
  return `${sym}${min}–${max}`
}

// ─── Stat Card ──────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 hover:shadow-sm transition-shadow">
      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 ${accent || "bg-gray-50 text-gray-600"}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Hospital Card ──────────────────────────────────────────
function HospitalCard({ hospital }: { hospital: NetworkHospital }) {
  const flag = COUNTRY_FLAG[hospital.country] || ""
  return (
    <Link
      href={`/agent/network/hospitals/${hospital.hospital_id}`}
      className="group bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 hover:border-gray-300 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {hospital.tier === "PREMIUM" && (
              <span className="text-[9px] font-bold tracking-wider uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Premium</span>
            )}
            {hospital.accreditations?.includes("JCI Accredited") && (
              <span className="text-[9px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">JCI</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-gray-700 transition-colors">{hospital.name}</h3>
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {hospital.city}, {hospital.country} {flag}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
      </div>

      {hospital.description && (
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{hospital.description}</p>
      )}

      {hospital.specializations && hospital.specializations.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {hospital.specializations.slice(0, 4).map(s => (
            <span key={s} className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">{s}</span>
          ))}
          {hospital.specializations.length > 4 && (
            <span className="text-[10px] text-gray-400 px-1">+{hospital.specializations.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-gray-900 text-gray-900" />
            <span className="text-xs font-bold text-gray-900">{parseFloat(String(hospital.avg_rating)).toFixed(1)}</span>
          </div>
          {hospital.bed_count > 0 && (
            <span className="text-[11px] text-gray-400">{hospital.bed_count} beds</span>
          )}
          {hospital.doctor_count != null && hospital.doctor_count > 0 && (
            <span className="text-[11px] text-gray-400">{hospital.doctor_count} dokter</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {hospital.emergency_24h && <Clock className="h-3 w-3 text-green-500" />}
          {hospital.international_patients && <Globe2 className="h-3 w-3 text-blue-500" />}
          {hospital.insurance_panel && <Shield className="h-3 w-3 text-purple-500" />}
        </div>
      </div>
    </Link>
  )
}

// ─── Doctor Marketplace Card ────────────────────────────────
function DoctorCard({ doctor }: { doctor: MarketplaceDoctor }) {
  const fee = formatFee(doctor.consultation_fee_min, doctor.consultation_fee_max, doctor.currency)
  const flag = COUNTRY_FLAG[doctor.country] || ""
  const hospitalCount = doctor.hospital_count || 0
  const primaryName = doctor.primary_hospital_name || doctor.hospital
  const primaryCity = doctor.primary_hospital_city || doctor.hospital_location

  return (
    <Link
      href={`/agent/network/doctors/${doctor.id}`}
      className="group bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3 hover:border-gray-300 hover:shadow-md transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-gray-400 truncate">{doctor.title}</p>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mt-0.5 group-hover:text-gray-700 transition-colors">{doctor.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {doctor.is_featured && (
            <span className="text-[9px] font-bold tracking-wider uppercase text-white bg-gray-900 px-2 py-0.5 rounded-full">Top</span>
          )}
          {doctor.telemedicine_available && (
            <Video className="h-3.5 w-3.5 text-blue-500" />
          )}
        </div>
      </div>

      {/* Specialization badge */}
      <span className="inline-flex items-center w-fit text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
        {doctor.specialization}
        {doctor.subspecialization && <span className="text-gray-400 ml-1">· {doctor.subspecialization}</span>}
      </span>

      {/* Notable for */}
      {doctor.notable_for && (
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{doctor.notable_for}</p>
      )}

      {/* Conditions */}
      {doctor.conditions_treated && doctor.conditions_treated.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {doctor.conditions_treated.slice(0, 3).map(c => (
            <span key={c} className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">{c}</span>
          ))}
          {doctor.conditions_treated.length > 3 && (
            <span className="text-[10px] text-gray-400 px-1">+{doctor.conditions_treated.length - 3}</span>
          )}
        </div>
      )}

      {/* Hospital info — now shows multi-hospital */}
      <div className="flex items-start gap-2 mt-auto">
        <Building2 className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[12px] text-gray-700 font-medium leading-tight truncate">{primaryName}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {primaryCity}
            {hospitalCount > 1 && (
              <span className="ml-1 text-blue-500 font-medium">+{hospitalCount - 1} RS lainnya</span>
            )}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-gray-900 text-gray-900" />
            <span className="text-xs font-bold text-gray-900">{parseFloat(String(doctor.rating)).toFixed(1)}</span>
          </div>
          {doctor.experience_years && <span className="text-[11px] text-gray-400">{doctor.experience_years} thn</span>}
          {doctor.patients_treated && doctor.patients_treated > 0 && (
            <span className="text-[11px] text-gray-400 hidden sm:inline">{(doctor.patients_treated / 1000).toFixed(0)}k pasien</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {fee && <span className="text-[11px] text-gray-500 font-medium">{fee}</span>}
          <span className="text-sm">{flag}</span>
        </div>
      </div>
    </Link>
  )
}

// ─── Skeleton Loaders ───────────────────────────────────────
function StatSkeleton() {
  return <div className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse h-[88px]"><div className="flex items-center gap-4"><div className="h-12 w-12 bg-gray-100 rounded-xl" /><div className="space-y-2"><div className="h-6 bg-gray-100 rounded w-16" /><div className="h-3 bg-gray-100 rounded w-24" /></div></div></div>
}

function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse space-y-3">
      <div className="space-y-1.5"><div className="h-3 bg-gray-100 rounded w-1/3" /><div className="h-4 bg-gray-100 rounded w-2/3" /></div>
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-3/4" />
      <div className="h-px bg-gray-50 mt-3" />
      <div className="flex items-center gap-3 pt-1"><div className="h-3 bg-gray-100 rounded w-8" /><div className="h-3 bg-gray-100 rounded w-16" /></div>
    </div>
  )
}

// ─── Tab type ───────────────────────────────────────────────
type ActiveTab = "doctors" | "hospitals"

// ─── Main Page ──────────────────────────────────────────────
export default function NetworkMarketplacePage() {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>("doctors")
  const [query, setQuery] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [country, setCountry] = useState("")
  const [hospitals, setHospitals] = useState<NetworkHospital[]>([])
  const [doctors, setDoctors] = useState<MarketplaceDoctor[]>([])
  const [totalHospitals, setTotalHospitals] = useState(0)
  const [totalDoctors, setTotalDoctors] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch stats
  useEffect(() => {
    fetch("/api/network/stats")
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(console.error)
      .finally(() => setStatsLoading(false))
  }, [])

  // Fetch data
  const fetchData = useCallback(async (tab: ActiveTab, q: string, spec: string, cnt: string, pg: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (spec) params.set("specialization", spec)
      if (cnt) params.set("country", cnt)
      params.set("page", pg.toString())
      params.set("limit", "24")

      if (tab === "hospitals") {
        const res = await fetch(`/api/network/hospitals?${params}`)
        const data = await res.json()
        if (pg === 1) setHospitals(data.hospitals || [])
        else setHospitals(prev => [...prev, ...(data.hospitals || [])])
        setTotalHospitals(data.total || 0)
      } else {
        const res = await fetch(`/api/doctors?${params}`)
        const data = await res.json()
        if (pg === 1) setDoctors(data.doctors || [])
        else setDoctors(prev => [...prev, ...(data.doctors || [])])
        setTotalDoctors(data.total || 0)
      }
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
      fetchData(activeTab, query, specialization, country, 1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, specialization, country, activeTab, fetchData])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchData(activeTab, query, specialization, country, next)
  }

  const hasFilters = !!(specialization || country || query)
  const clearFilters = () => { setSpecialization(""); setCountry(""); setQuery(""); setPage(1) }

  const totalItems = activeTab === "hospitals" ? totalHospitals : totalDoctors
  const currentItems = activeTab === "hospitals" ? hospitals : doctors

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-500">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-5 sm:p-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWMkgyVjRoMzR6TTIgMzBoMnYySDJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-4xl font-bold text-white tracking-tight">
            Marketplace Dokter & Rumah Sakit
          </h1>
          <p className="text-xs sm:text-base text-white/60 mt-2 max-w-xl">
            Temukan dokter spesialis terbaik, jadwal praktik, rumah sakit, dan teknologi medis terkini di Asia Tenggara.
          </p>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : stats ? (
          <>
            <StatCard icon={Users} label="Total Dokter" value={stats.total_doctors} sub="Spesialis terverifikasi" accent="bg-emerald-50 text-emerald-600" />
            <StatCard icon={Hospital} label="Total Rumah Sakit" value={stats.total_hospitals} sub={`${stats.partner_hospitals} mitra aktif`} accent="bg-blue-50 text-blue-600" />
            <StatCard icon={Award} label="JCI Accredited" value={stats.jci_accredited} sub="Standar internasional" accent="bg-amber-50 text-amber-600" />
            <StatCard icon={Zap} label="Premium Tier" value={stats.premium_hospitals} sub="Teknologi terdepan" accent="bg-purple-50 text-purple-600" />
          </>
        ) : null}
      </div>

      {/* ── Country breakdown ── */}
      {stats && stats.countries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.countries.map(c => (
            <button
              key={c.country}
              onClick={() => { setCountry(prev => prev === c.country ? "" : c.country) }}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                country === c.country
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <span className="text-2xl">{COUNTRY_FLAG[c.country] || "🌏"}</span>
              <div className="text-left">
                <p className={`text-sm font-semibold ${country === c.country ? "text-white" : "text-gray-900"}`}>{c.country}</p>
                <p className={`text-[11px] ${country === c.country ? "text-white/60" : "text-gray-400"}`}>
                  {c.hospital_count} RS · {c.doctor_count} Dokter
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Toolbar: Tabs + Search + Filters ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Tab switcher */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab("doctors")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-4 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "doctors"
                ? "text-gray-900 border-gray-900"
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
          >
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Dokter Spesialis</span>
            <span className="sm:hidden">Dokter</span>
            {totalDoctors > 0 && activeTab === "doctors" && (
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">{totalDoctors}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("hospitals")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-4 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "hospitals"
                ? "text-gray-900 border-gray-900"
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Rumah Sakit</span>
            <span className="sm:hidden">RS</span>
            {totalHospitals > 0 && activeTab === "hospitals" && (
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">{totalHospitals}</span>
            )}
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3 sm:gap-4 p-4 sm:p-8 border-b border-gray-50 bg-gray-50/30">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={activeTab === "hospitals" ? "Cari nama rumah sakit, kota, atau teknologi..." : "Cari nama dokter, spesialisasi, kondisi, atau rumah sakit..."}
              className="w-full pl-12 pr-10 py-3 sm:py-3.5 bg-white border border-gray-200 text-gray-900 text-sm sm:text-[15px] rounded-xl focus:outline-none focus:border-gray-300 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Specialization chips (doctors tab) */}
          {activeTab === "doctors" && (
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide -mx-1 px-1">
              {SPECIALIZATIONS.map(spec => {
                const Icon = spec.icon
                const active = specialization === spec.key
                return (
                  <button
                    key={spec.key}
                    onClick={() => setSpecialization(prev => prev === spec.key ? "" : spec.key)}
                    className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-[12px] sm:text-[13px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border shadow-sm font-semibold shrink-0 transition-all duration-200 ${
                      active ? "bg-gray-900 text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {spec.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Country chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {COUNTRIES.map(c => {
              const active = country === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setCountry(prev => prev === c.key ? "" : c.key)}
                  className={`whitespace-nowrap text-[12px] sm:text-[13px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border shadow-sm font-semibold shrink-0 transition-all duration-200 ${
                    active ? "bg-gray-900 text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="shrink-0 flex items-center gap-1.5 text-[12px] bg-red-50 text-red-600 px-3 py-2 rounded-xl hover:bg-red-100 font-semibold transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        <div className="p-4 sm:p-8">
          {loading && currentItems.length === 0 ? (
            <div className={`grid gap-3 sm:gap-6 ${activeTab === "hospitals" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
              {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center bg-gray-50/50 rounded-2xl border border-gray-100/50 min-h-[250px] sm:min-h-[300px]">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4 sm:mb-5 shadow-sm">
                <Search className="h-6 w-6 sm:h-7 sm:w-7 text-gray-300" />
              </div>
              <p className="font-bold text-gray-900 text-base sm:text-lg mb-2">Tidak ditemukan</p>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm px-4">Coba ubah kata kunci atau filter untuk menemukan data yang sesuai.</p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-4 sm:mt-5 text-[13px] bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm">
                  Hapus semua filter
                </button>
              )}
            </div>
          ) : activeTab === "hospitals" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {hospitals.map(h => <HospitalCard key={h.hospital_id} hospital={h} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {doctors.map(d => <DoctorCard key={d.id} doctor={d} />)}
            </div>
          )}
        </div>

        {/* Load More */}
        {!loading && currentItems.length < totalItems && (
          <div className="flex justify-center py-5 sm:py-6 px-4 sm:px-8 border-t border-gray-50 bg-gray-50/30">
            <Button
              variant="outline"
              onClick={loadMore}
              className="gap-2 text-[13px] sm:text-[14px] font-semibold border-gray-200 text-gray-700 hover:bg-white hover:text-gray-900 bg-white h-11 sm:h-12 px-6 sm:px-8 rounded-xl shadow-sm transition-all"
            >
              Tampilkan lebih banyak <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
