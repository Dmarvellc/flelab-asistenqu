"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Building2, MapPin, Star, Shield, Globe2, Stethoscope, Phone,
  ExternalLink, Clock, Award, Users, Zap, Heart, ChevronRight, BadgeCheck,
  Video, Calendar, GraduationCap, Activity, Briefcase, MessageCircle,
  ClipboardList, UserCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Types ──────────────────────────────────────────────────
interface DoctorHospitalLink {
  id: string
  hospital_id: string
  hospital_name: string
  hospital_city: string
  hospital_country: string
  hospital_tier: string
  is_primary: boolean
  consultation_fee_min: number
  consultation_fee_max: number
  currency: string
  room_number: string | null
  floor: string | null
}

interface DoctorSchedule {
  schedule_id: string
  hospital_id: string
  hospital_name: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  max_patients: number
  is_active: boolean
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
  accepting_new_patients: boolean
  bio: string | null
  gender: string | null
  photo_url: string | null
  total_reviews: number
  patients_treated: number
  qualifications: string[]
  certifications: string[]
  procedures_offered: string[]
  conditions_treated: string[]
  available_days: string[]
  hospitals: DoctorHospitalLink[]
  schedules: DoctorSchedule[]
}

const COUNTRY_FLAG: Record<string, string> = {
  Singapore: "🇸🇬", Malaysia: "🇲🇾", Indonesia: "🇮🇩", Thailand: "🇹🇭", India: "🇮🇳",
}

const CURRENCY_SYMBOL: Record<string, string> = {
  IDR: "Rp", MYR: "RM", SGD: "S$", THB: "฿", INR: "₹",
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

function formatFee(min?: number, max?: number, currency?: string): string {
  if (!min || !max || !currency) return ""
  const sym = CURRENCY_SYMBOL[currency] || currency
  if (currency === "IDR") return `${sym}${(min / 1000).toFixed(0)}–${(max / 1000).toFixed(0)}rb`
  return `${sym}${min}–${max}`
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

// ─── Section Component ──────────────────────────────────────
function Section({ title, icon: Icon, children, className = "" }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50 bg-gray-50/40">
        <Icon className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────
export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [doctor, setDoctor] = useState<MarketplaceDoctor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/doctors/${id}`)
      .then(r => r.json())
      .then(setDoctor)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-32" />
        <div className="h-64 bg-gray-100 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-bold text-gray-900 mb-2">Dokter tidak ditemukan</p>
        <Button variant="outline" onClick={() => router.back()}>Kembali</Button>
      </div>
    )
  }

  const flag = COUNTRY_FLAG[doctor.country] || ""
  const primaryHospital = doctor.hospitals?.find(h => h.is_primary)

  // Group schedules by hospital
  const schedulesByHospital = (doctor.schedules || []).reduce<Record<string, { name: string; id: string; items: DoctorSchedule[] }>>((acc, s) => {
    if (!acc[s.hospital_id]) acc[s.hospital_id] = { name: s.hospital_name, id: s.hospital_id, items: [] }
    acc[s.hospital_id].items.push(s)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Marketplace
      </button>

      {/* ── Hero Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWMkgyVjRoMzR6TTIgMzBoMnYySDJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex flex-col gap-4">
          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {doctor.is_featured && (
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-200 bg-amber-500/20 border border-amber-400/30 px-2.5 py-1 rounded-full">Top Doctor</span>
            )}
            {doctor.telemedicine_available && (
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-200 bg-blue-500/20 border border-blue-400/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Video className="h-3 w-3" /> Telemedicine
              </span>
            )}
            {doctor.accepting_new_patients && (
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-200 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-full">Menerima Pasien Baru</span>
            )}
          </div>

          {/* Name */}
          <div>
            <p className="text-sm text-white/50">{doctor.title}</p>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight mt-1">{doctor.name}</h1>
          </div>

          {/* Specialization */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white/80 bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg">
              {doctor.specialization}
              {doctor.subspecialization && <span className="text-white/50"> · {doctor.subspecialization}</span>}
            </span>
            <span className="text-sm text-white/50">{flag} {doctor.country}</span>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-white font-bold">{parseFloat(String(doctor.rating)).toFixed(1)}</span>
              {doctor.total_reviews > 0 && <span className="text-white/40 text-sm">({doctor.total_reviews.toLocaleString()} ulasan)</span>}
            </div>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Briefcase className="h-4 w-4" /> {doctor.experience_years} tahun pengalaman
            </div>
            {doctor.patients_treated > 0 && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <UserCheck className="h-4 w-4" /> {doctor.patients_treated.toLocaleString()} pasien
              </div>
            )}
            {doctor.hospitals && doctor.hospitals.length > 1 && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Building2 className="h-4 w-4" /> Praktik di {doctor.hospitals.length} rumah sakit
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Info Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Stethoscope className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">{doctor.specialization}</p>
            <p className="text-[10px] text-gray-500">Spesialisasi</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">{doctor.experience_years} Tahun</p>
            <p className="text-[10px] text-gray-500">Pengalaman</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">{doctor.hospitals?.length || 1} RS</p>
            <p className="text-[10px] text-gray-500">Tempat Praktik</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <MessageCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">{doctor.languages?.join(", ") || "-"}</p>
            <p className="text-[10px] text-gray-500">Bahasa</p>
          </div>
        </div>
      </div>

      {/* ── Bio ── */}
      {(doctor.bio || doctor.notable_for) && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6">
          <p className="text-sm text-gray-600 leading-relaxed">{doctor.bio || doctor.notable_for}</p>
        </div>
      )}

      {/* ── Practice Locations (Hospitals) ── */}
      {doctor.hospitals && doctor.hospitals.length > 0 && (
        <Section title={`Tempat Praktik (${doctor.hospitals.length} Rumah Sakit)`} icon={Building2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {doctor.hospitals.map(h => {
              const fee = formatFee(h.consultation_fee_min, h.consultation_fee_max, h.currency)
              const hFlag = COUNTRY_FLAG[h.hospital_country] || ""
              const hospitalSchedules = schedulesByHospital[h.hospital_id]?.items || []
              return (
                <Link
                  key={h.id}
                  href={`/agent/network/hospitals/${h.hospital_id}`}
                  className={`group flex flex-col gap-3 p-5 rounded-xl border transition-all hover:shadow-md ${
                    h.is_primary ? "bg-blue-50/30 border-blue-200 hover:border-blue-300" : "bg-gray-50/50 border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {h.is_primary && (
                          <span className="text-[9px] font-bold tracking-wider uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Utama</span>
                        )}
                        {h.hospital_tier === "PREMIUM" && (
                          <span className="text-[9px] font-bold tracking-wider uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Premium</span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">{h.hospital_name}</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {h.hospital_city}, {h.hospital_country} {hFlag}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1" />
                  </div>

                  {(h.room_number || h.floor) && (
                    <p className="text-[11px] text-gray-500">
                      {h.room_number && <span>Ruang: {h.room_number}</span>}
                      {h.room_number && h.floor && <span> · </span>}
                      {h.floor && <span>Lantai {h.floor}</span>}
                    </p>
                  )}

                  {/* Schedule for this hospital */}
                  {hospitalSchedules.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {hospitalSchedules.map(s => (
                        <span key={s.schedule_id} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md font-medium">
                          {DAY_SHORT[s.day_of_week]} {formatTime(s.start_time)}-{formatTime(s.end_time)}
                        </span>
                      ))}
                    </div>
                  )}

                  {fee && (
                    <div className="flex items-center gap-1 pt-2 border-t border-gray-100/60 mt-auto">
                      <span className="text-xs font-semibold text-gray-900">{fee}</span>
                      <span className="text-[10px] text-gray-400">/ konsultasi</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Weekly Schedule ── */}
      {Object.keys(schedulesByHospital).length > 0 && (
        <Section title="Jadwal Praktik Mingguan" icon={Calendar}>
          <div className="flex flex-col gap-6">
            {Object.values(schedulesByHospital).map(group => (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <h4 className="text-xs font-bold text-gray-700">{group.name}</h4>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const slots = group.items.filter(s => s.day_of_week === day)
                    const hasSlot = slots.length > 0
                    return (
                      <div
                        key={day}
                        className={`flex flex-col items-center p-2 sm:p-3 rounded-xl border text-center min-h-[70px] ${
                          hasSlot
                            ? "bg-emerald-50/50 border-emerald-200"
                            : "bg-gray-50/50 border-gray-100"
                        }`}
                      >
                        <p className={`text-[10px] sm:text-[11px] font-bold ${hasSlot ? "text-emerald-700" : "text-gray-400"}`}>
                          {DAY_SHORT[day]}
                        </p>
                        {slots.map(s => (
                          <p key={s.schedule_id} className="text-[9px] sm:text-[10px] text-emerald-600 mt-1 leading-tight">
                            {formatTime(s.start_time)}<br />{formatTime(s.end_time)}
                          </p>
                        ))}
                        {!hasSlot && <p className="text-[9px] text-gray-300 mt-2">-</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Two Column: Qualifications + Conditions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Qualifications & Certifications */}
        {((doctor.qualifications?.length || 0) + (doctor.certifications?.length || 0)) > 0 && (
          <Section title="Kualifikasi & Sertifikasi" icon={GraduationCap}>
            <div className="flex flex-wrap gap-2">
              {doctor.qualifications?.map(q => (
                <span key={q} className="text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <GraduationCap className="h-3 w-3 text-blue-500" /> {q}
                </span>
              ))}
              {doctor.certifications?.map(c => (
                <span key={c} className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Award className="h-3 w-3 text-amber-500" /> {c}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Conditions Treated */}
        {doctor.conditions_treated && doctor.conditions_treated.length > 0 && (
          <Section title="Kondisi yang Ditangani" icon={Activity}>
            <div className="flex flex-wrap gap-2">
              {doctor.conditions_treated.map(c => (
                <span key={c} className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  {c}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* ── Procedures */}
      {doctor.procedures_offered && doctor.procedures_offered.length > 0 && (
        <Section title="Prosedur & Tindakan" icon={ClipboardList}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {doctor.procedures_offered.map(p => (
              <div key={p} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Zap className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="text-xs font-medium text-gray-700">{p}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
