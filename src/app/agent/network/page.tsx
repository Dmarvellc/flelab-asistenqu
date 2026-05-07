"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import {
  Search, Building2, MapPin, Star, Stethoscope, X, Video,
  Heart, Brain, Bone, Microscope, Eye, Baby, Activity, Droplets,
  Hospital, ChevronRight, ShieldCheck,
} from "lucide-react"
import { GENERALI_PROVIDERS, type GeneraliProvider } from "@/lib/generali-providers"

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
  logo_url: string | null
  cover_image_url: string | null
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
  photo_url?: string | null
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

// ─── Helpers ────────────────────────────────────────────────
const CURRENCY_SYMBOL: Record<string, string> = { IDR: "Rp", MYR: "RM", SGD: "S$", THB: "฿", INR: "₹" }
const COUNTRY_CODE: Record<string, string> = { Malaysia: "MY", Indonesia: "ID", Singapore: "SG", Thailand: "TH", India: "IN" }

function clearbitLogo(website: string | null | undefined): string | null {
  if (!website) return null
  try {
    const host = new URL(website).hostname.replace(/^www\./, "")
    return `https://logo.clearbit.com/${host}`
  } catch { return null }
}

// Treat auto-generated avatars as missing so we fall back to a clean monogram.
function isFakeAvatar(url: string | null | undefined): boolean {
  return !!url && /dicebear|robohash|gravatar|ui-avatars|picsum/i.test(url)
}

function initialsOf(name: string): string {
  return (
    name
      .replace(/^(dr\.|Dr\.|Dato'|Datin|Dato|Datuk|Tan Sri|Prof\.|Prof|Sri)\s*/gi, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0] || "")
      .join("")
      .toUpperCase() || "DR"
  )
}

function formatFee(min?: number, max?: number, currency?: string): string {
  if (!min || !max || !currency) return ""
  const sym = CURRENCY_SYMBOL[currency] || currency
  if (currency === "IDR") return `${sym}${Math.round(min / 1000)}–${Math.round(max / 1000)}rb`
  return `${sym}${min}–${max}`
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
]

// ─── Header (no separate background, sits flat on the page) ──
// Header counts use the live API total when we already have it (so they
// stay in sync with the visible list). Falls back to the cached
// /api/network/stats values until the first list request resolves.
function PageHeader({
  stats, doctorCount, hospitalCount,
}: {
  stats: NetworkStats | null
  doctorCount: number
  hospitalCount: number
}) {
  return (
    <header className="pt-2 pb-6 sm:pb-8">
      <h1 className="text-2xl sm:text-4xl font-semibold text-slate-900 tracking-tight max-w-2xl leading-tight">
        Marketplace Dokter & Rumah Sakit
      </h1>
      <p className="mt-2 text-sm sm:text-[15px] text-slate-500 max-w-xl leading-relaxed">
        Direktori spesialis dan provider yang terverifikasi di Asia Tenggara, termasuk jaringan Generali.
      </p>
      <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-y-4 gap-x-8 max-w-2xl">
        <HeaderStat value={doctorCount} label="Dokter terdaftar" />
        <HeaderStat value={hospitalCount} label="Rumah sakit" />
        <HeaderStat value={stats?.partner_hospitals} label="Mitra aktif" />
      </div>
    </header>
  )
}

function HeaderStat({ value, label }: { value?: number | null; label: string }) {
  const displayValue = value ?? 0
  return (
    <div>
      <p className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">{displayValue.toLocaleString("id-ID")}</p>
      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 tracking-wide">{label}</p>
    </div>
  )
}

// ─── Hospital Logo Strip Filter ─────────────────────────────
function LogoStrip({
  hospitals, selected, onSelect,
}: {
  hospitals: NetworkHospital[]
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  if (hospitals.length === 0) return null
  return (
    <div className="border-b border-gray-100 -mx-4 px-4 sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-1 overflow-x-auto py-4 scrollbar-hide">
        {hospitals.slice(0, 30).map((h) => {
          const logo = h.logo_url && !isFakeAvatar(h.logo_url) ? h.logo_url : clearbitLogo(h.website)
          const active = selected === h.hospital_id
          return (
            <button
              key={h.hospital_id}
              onClick={() => onSelect(active ? null : h.hospital_id)}
              title={h.name}
              className={`group shrink-0 px-3 py-2 transition-all ${active ? "" : "opacity-50 hover:opacity-100"}`}
            >
              <div className={`h-10 w-24 sm:h-12 sm:w-28 flex items-center justify-center transition-all ${active ? "" : "grayscale group-hover:grayscale-0"}`}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={h.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[10px] font-medium text-gray-400 line-clamp-2 text-center px-1">{h.name.split("(")[0].trim()}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Doctor Row (flat, no card) ─────────────────────────────
function DoctorRow({ doctor }: { doctor: MarketplaceDoctor }) {
  const photo = isFakeAvatar(doctor.photo_url) ? null : doctor.photo_url
  const fee = formatFee(doctor.consultation_fee_min, doctor.consultation_fee_max, doctor.currency)
  const cc = COUNTRY_CODE[doctor.country] || doctor.country
  const primaryHospital = doctor.primary_hospital_name || doctor.hospital
  const primaryCity = doctor.primary_hospital_city || doctor.hospital_location

  return (
    <Link
      href={`/agent/network/doctors/${doctor.id}`}
      className="group flex items-start gap-4 sm:gap-6 py-5 sm:py-6 border-b border-gray-100 hover:bg-slate-50/60 transition-colors -mx-4 px-4 sm:-mx-6 sm:px-6"
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={doctor.name} className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover bg-slate-100 shrink-0" />
      ) : (
        <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[13px] sm:text-sm font-medium text-slate-500 tracking-wide">
          {initialsOf(doctor.name)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{doctor.title}</p>
            <h3 className="mt-1 font-semibold text-slate-900 text-[15px] sm:text-base leading-snug group-hover:text-slate-700 transition-colors">
              {doctor.name}
            </h3>
            <p className="mt-1 text-[13px] text-slate-600">
              {doctor.specialization}
              {doctor.subspecialization && <span className="text-slate-400"> · {doctor.subspecialization}</span>}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 justify-end">
              <Star className="h-3.5 w-3.5 fill-slate-900 text-slate-900" />
              <span className="text-sm font-semibold text-slate-900">{parseFloat(String(doctor.rating)).toFixed(1)}</span>
            </div>
            {fee && <p className="mt-1 text-[12px] text-slate-500">{fee}</p>}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-x-4 gap-y-1 text-[12px] text-slate-500 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-300" />
            <span className="text-slate-700 font-medium">{primaryHospital}</span>
            <span className="text-slate-400">· {primaryCity}</span>
          </span>
          {doctor.experience_years > 0 && <span>{doctor.experience_years} thn pengalaman</span>}
          {doctor.telemedicine_available && (
            <span className="inline-flex items-center gap-1 text-teal-700">
              <Video className="h-3 w-3" /> Telemedicine
            </span>
          )}
          <span className="text-slate-300 text-[11px] font-mono tracking-wider ml-auto">{cc}</span>
        </div>
      </div>
    </Link>
  )
}

// ─── Hospital Row (flat) ────────────────────────────────────
function HospitalRow({ hospital }: { hospital: NetworkHospital }) {
  const logo = hospital.logo_url && !isFakeAvatar(hospital.logo_url) ? hospital.logo_url : clearbitLogo(hospital.website)
  const cc = COUNTRY_CODE[hospital.country] || hospital.country
  const isJci = hospital.accreditations?.some((a) => a?.toUpperCase().includes("JCI"))

  return (
    <Link
      href={`/agent/network/hospitals/${hospital.hospital_id}`}
      className="group flex items-center gap-4 sm:gap-6 py-5 border-b border-gray-100 hover:bg-slate-50/60 transition-colors -mx-4 px-4 sm:-mx-6 sm:px-6"
    >
      <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center bg-white border border-gray-100 rounded-md shrink-0 p-1.5">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <Building2 className="h-5 w-5 text-gray-300" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 text-[15px] leading-snug group-hover:text-slate-700 transition-colors line-clamp-1">
          {hospital.name}
        </h3>
        <p className="mt-1 text-[12px] text-slate-500 flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 text-slate-300" />
          {hospital.city}, {hospital.country}
          {hospital.bed_count > 0 && <span className="text-slate-300">·</span>}
          {hospital.bed_count > 0 && <span>{hospital.bed_count} bed</span>}
          {hospital.doctor_count != null && hospital.doctor_count > 0 && <span className="text-slate-300">·</span>}
          {hospital.doctor_count != null && hospital.doctor_count > 0 && <span>{hospital.doctor_count} dokter</span>}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-3 shrink-0">
        {hospital.tier === "PREMIUM" && (
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">Premium</span>
        )}
        {isJci && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-slate-500">
            <ShieldCheck className="h-3 w-3" /> JCI
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-slate-900 text-slate-900" />
          <span className="text-[13px] font-semibold text-slate-900">{parseFloat(String(hospital.avg_rating)).toFixed(1)}</span>
        </div>
        <span className="text-slate-300 text-[11px] font-mono tracking-wider w-6 text-right">{cc}</span>
      </div>
    </Link>
  )
}

// ─── Generali-only Provider Row ─────────────────────────────
// Used for Generali-network providers that don't have a corresponding
// row in the doctors/hospitals DB. Visually consistent with HospitalRow
// but lighter (no rating/bed count, marked with a small Generali tag).
function GeneraliRow({ provider }: { provider: GeneraliProvider }) {
  const cc = provider.country === "MALAYSIA" ? "MY" : "SG"
  return (
    <div className="flex items-center gap-4 sm:gap-6 py-5 border-b border-gray-100 -mx-4 px-4 sm:-mx-6 sm:px-6">
      <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center bg-white border border-gray-100 rounded-md shrink-0">
        <Building2 className="h-4 w-4 text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-900 text-[15px] leading-snug line-clamp-1">{provider.name}</h3>
        <p className="mt-1 text-[12px] text-slate-500 flex items-center gap-1.5 line-clamp-1">
          <MapPin className="h-3 w-3 shrink-0 text-slate-300" />
          {provider.city}, {provider.state}
          <span className="text-slate-300">·</span>
          <span>{provider.network}</span>
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-slate-400 shrink-0">
        <ShieldCheck className="h-3 w-3" /> Generali
      </span>
      <span className="text-slate-300 text-[11px] font-mono tracking-wider w-6 text-right">{cc}</span>
    </div>
  )
}

// ─── Skeletons ──────────────────────────────────────────────
function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-5 border-b border-gray-100 -mx-4 px-4 sm:-mx-6 sm:px-6 animate-pulse">
      <div className="h-14 w-14 rounded-full bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-100 rounded w-1/4" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-1/3" />
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────
type ActiveTab = "doctors" | "hospitals"

// Normalize hospital names for fuzzy dedup between the DB hospitals and
// the Generali provider directory.
function normalizeName(s: string): string {
  return s
    .toUpperCase()
    .replace(/SDN\.?\s*BHD\.?/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[.,'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export default function NetworkMarketplacePage() {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>("doctors")
  const [query, setQuery] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [country, setCountry] = useState("")
  const [hospitalFilter, setHospitalFilter] = useState<string | null>(null)
  const [hospitals, setHospitals] = useState<NetworkHospital[]>([])
  const [doctors, setDoctors] = useState<MarketplaceDoctor[]>([])
  const [totalHospitals, setTotalHospitals] = useState(0)
  const [totalDoctors, setTotalDoctors] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch stats once
  useEffect(() => {
    fetch("/api/network/stats").then((r) => r.json()).then(setStats).catch(console.error)
  }, [])

  // Fetch top hospitals once for the logo strip
  const [logoStripHospitals, setLogoStripHospitals] = useState<NetworkHospital[]>([])
  useEffect(() => {
    fetch("/api/network/hospitals?limit=30")
      .then((r) => r.json())
      .then((d) => setLogoStripHospitals(d.hospitals || []))
      .catch(console.error)
  }, [])

  const fetchData = useCallback(
    async (tab: ActiveTab, q: string, spec: string, cnt: string, hospId: string | null, pg: number) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (q) params.set("q", q)
        if (spec) params.set("specialization", spec)
        if (cnt) params.set("country", cnt)
        if (hospId && tab === "doctors") {
          const h = logoStripHospitals.find((x) => x.hospital_id === hospId)
          if (h) params.set("hospital", h.name)
        }
        params.set("page", pg.toString())
        params.set("limit", "20")

        if (tab === "hospitals") {
          const res = await fetch(`/api/network/hospitals?${params}`)
          const data = await res.json()
          if (pg === 1) setHospitals(data.hospitals || [])
          else setHospitals((prev) => [...prev, ...(data.hospitals || [])])
          setTotalHospitals(data.total || 0)
        } else {
          const res = await fetch(`/api/doctors?${params}`)
          const data = await res.json()
          if (pg === 1) setDoctors(data.doctors || [])
          else setDoctors((prev) => [...prev, ...(data.doctors || [])])
          setTotalDoctors(data.total || 0)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    },
    [logoStripHospitals]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchData(activeTab, query, specialization, country, hospitalFilter, 1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, specialization, country, hospitalFilter, activeTab, fetchData])

  // Generali providers that don't already exist in the DB hospitals tab.
  // Filtered by the same query / country controls so the merged list feels
  // like one continuous directory.
  const generaliExtra = useMemo(() => {
    if (activeTab !== "hospitals") return []
    const dbNames = new Set(hospitals.map((h) => normalizeName(h.name)))
    const q = query.toLowerCase().trim()
    const cnt = country ? country.toUpperCase() : ""
    return GENERALI_PROVIDERS.filter((p) => {
      if (dbNames.has(normalizeName(p.name))) return false
      if (cnt && p.country !== cnt) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.network.toLowerCase().includes(q)
      )
    })
  }, [activeTab, hospitals, query, country])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchData(activeTab, query, specialization, country, hospitalFilter, next)
  }

  const hasFilters = !!(specialization || country || query || hospitalFilter)
  const clearFilters = () => {
    setSpecialization("")
    setCountry("")
    setQuery("")
    setHospitalFilter(null)
    setPage(1)
  }

  const totalHospitalRows = totalHospitals + generaliExtra.length
  const totalItems = activeTab === "hospitals" ? totalHospitalRows : totalDoctors

  return (
    <div className="animate-in fade-in duration-500">
      <PageHeader
        stats={stats}
        doctorCount={totalDoctors || stats?.total_doctors || 0}
        hospitalCount={totalHospitalRows || stats?.total_hospitals || 0}
      />

      {/* Hospital logo filter strip (only for doctors tab) */}
      {activeTab === "doctors" && (
        <LogoStrip hospitals={logoStripHospitals} selected={hospitalFilter} onSelect={setHospitalFilter} />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-6 sm:gap-10 mt-6 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <TabButton active={activeTab === "doctors"} onClick={() => setActiveTab("doctors")} icon={Stethoscope} label="Dokter" count={totalDoctors} />
        <TabButton active={activeTab === "hospitals"} onClick={() => setActiveTab("hospitals")} icon={Hospital} label="Rumah Sakit" count={totalHospitalRows} />
      </div>

      {/* Search */}
      <div className="mt-6 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              activeTab === "hospitals"
                ? "Cari rumah sakit, kota, jaringan Generali..."
                : "Cari dokter, spesialisasi, kondisi..."
            }
            className="w-full pl-8 pr-10 py-3.5 text-[15px] text-slate-900 bg-transparent border-0 border-b border-slate-200 focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="mt-5 flex flex-col gap-3 -mx-4 px-4 sm:-mx-6 sm:px-6">
        {activeTab === "doctors" && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {SPECIALIZATIONS.map((spec) => {
              const Icon = spec.icon
              const active = specialization === spec.key
              return (
                <button
                  key={spec.key}
                  onClick={() => setSpecialization((prev) => (prev === spec.key ? "" : spec.key))}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full transition-colors shrink-0 ${
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {spec.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "", label: "Semua Negara" },
            { key: "Malaysia", label: "Malaysia" },
            { key: "Indonesia", label: "Indonesia" },
            { key: "Singapore", label: "Singapura" },
          ].map((c) => {
            const active = country === c.key
            return (
              <button
                key={c.key}
                onClick={() => setCountry((prev) => (prev === c.key ? "" : c.key))}
                className={`text-[12px] sm:text-[13px] px-3 py-1.5 rounded-full transition-colors ${
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {c.label}
              </button>
            )
          })}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-700 ml-auto"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Results — flat list, no card wrapper */}
      <div className="mt-2 sm:mt-4">
        {loading && (activeTab === "doctors" ? doctors : hospitals).length === 0 ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
          </div>
        ) : totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center -mx-4 px-4 sm:-mx-6 sm:px-6">
            <Search className="h-8 w-8 text-slate-200 mb-4" />
            <p className="text-[15px] font-medium text-slate-700">Tidak ditemukan</p>
            <p className="text-[13px] text-slate-400 mt-1 max-w-sm">Coba ubah kata kunci atau hapus filter.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-[13px] text-slate-700 underline underline-offset-4">
                Hapus semua filter
              </button>
            )}
          </div>
        ) : activeTab === "doctors" ? (
          <div>
            {doctors.map((d) => <DoctorRow key={d.id} doctor={d} />)}
          </div>
        ) : (
          <div>
            {hospitals.map((h) => <HospitalRow key={h.hospital_id} hospital={h} />)}
            {generaliExtra.map((p) => <GeneraliRow key={`g-${p.no}`} provider={p} />)}
          </div>
        )}

        {/* Load more — only when DB hospitals/doctors have more pages */}
        {!loading &&
          (activeTab === "doctors" ? doctors.length < totalDoctors : hospitals.length < totalHospitals) && (
            <div className="flex justify-center py-8">
              <button
                onClick={loadMore}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Tampilkan lebih banyak <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
      </div>
    </div>
  )
}

function TabButton({
  active, onClick, icon: Icon, label, count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 py-3 -mb-px border-b-2 transition-colors text-[14px] sm:text-[15px] ${
        active ? "border-slate-900 text-slate-900 font-semibold" : "border-transparent text-slate-400 hover:text-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count != null && count > 0 && (
        <span className={`text-[11px] font-medium ${active ? "text-slate-500" : "text-slate-300"}`}>{count.toLocaleString("id-ID")}</span>
      )}
    </button>
  )
}
