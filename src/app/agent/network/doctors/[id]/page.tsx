"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Building2, MapPin, Star,
  Video, GraduationCap, ClipboardList, ChevronRight,
} from "lucide-react"

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

const CURRENCY_SYMBOL: Record<string, string> = { IDR: "Rp", MYR: "RM", SGD: "S$", THB: "฿", INR: "₹" }
const COUNTRY_CODE: Record<string, string> = { Malaysia: "MY", Indonesia: "ID", Singapore: "SG", Thailand: "TH", India: "IN" }
const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

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

function clearbitLogo(website: string | null | undefined): string | null {
  if (!website) return null
  try {
    const host = new URL(website).hostname.replace(/^www\./, "")
    return `https://logo.clearbit.com/${host}`
  } catch {
    return null
  }
}

function formatFee(min?: number, max?: number, currency?: string): string {
  if (!min || !max || !currency) return ""
  const sym = CURRENCY_SYMBOL[currency] || currency
  if (currency === "IDR") return `${sym}${Math.round(min / 1000)}–${Math.round(max / 1000)}rb`
  return `${sym}${min}–${max}`
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

// ─── Section ────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-7 sm:py-8 border-t border-gray-100">
      <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-400 mb-4">{title}</h2>
      {children}
    </section>
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
    fetch(`/api/doctors/${id}`).then((r) => r.json()).then(setDoctor).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 pt-2">
        <div className="h-4 bg-slate-100 rounded w-32" />
        <div className="flex items-start gap-5 pt-4">
          <div className="h-20 w-20 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-100 rounded w-1/4" />
            <div className="h-6 bg-slate-100 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-[15px] font-medium text-slate-700 mb-3">Dokter tidak ditemukan</p>
        <button onClick={() => router.back()} className="text-[13px] text-slate-700 underline underline-offset-4">
          Kembali
        </button>
      </div>
    )
  }

  const photo = isFakeAvatar(doctor.photo_url) ? null : doctor.photo_url
  const cc = COUNTRY_CODE[doctor.country] || doctor.country
  const fee = formatFee(doctor.consultation_fee_min, doctor.consultation_fee_max, doctor.currency)

  // Group schedules by hospital
  const schedulesByHospital = (doctor.schedules || []).reduce<
    Record<string, { name: string; id: string; items: DoctorSchedule[] }>
  >((acc, s) => {
    if (!acc[s.hospital_id]) acc[s.hospital_id] = { name: s.hospital_name, id: s.hospital_id, items: [] }
    acc[s.hospital_id].items.push(s)
    return acc
  }, {})

  return (
    <div className="animate-in fade-in duration-500">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[13px] text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Marketplace
      </button>

      {/* Doctor header (flat, no card) */}
      <div className="mt-8 sm:mt-10 flex items-start gap-5 sm:gap-7">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={doctor.name}
            className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover bg-slate-100 shrink-0"
          />
        ) : (
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-base sm:text-lg font-medium text-slate-500 tracking-wide">
            {initialsOf(doctor.name)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-medium">{doctor.title}</p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight leading-tight">
            {doctor.name}
          </h1>
          <p className="mt-2 text-[14px] sm:text-[15px] text-slate-600">
            {doctor.specialization}
            {doctor.subspecialization && <span className="text-slate-400"> · {doctor.subspecialization}</span>}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-slate-900 text-slate-900" />
              <span className="text-slate-900 font-semibold">{parseFloat(String(doctor.rating)).toFixed(1)}</span>
              {doctor.total_reviews > 0 && <span className="text-slate-400">({doctor.total_reviews.toLocaleString("id-ID")} ulasan)</span>}
            </span>
            {doctor.experience_years > 0 && <span>{doctor.experience_years} tahun pengalaman</span>}
            {doctor.patients_treated > 0 && <span>{doctor.patients_treated.toLocaleString("id-ID")} pasien</span>}
            {doctor.telemedicine_available && (
              <span className="inline-flex items-center gap-1 text-teal-700">
                <Video className="h-3.5 w-3.5" /> Telemedicine
              </span>
            )}
            <span className="text-slate-300 text-[11px] font-mono tracking-wider ml-auto">{cc}</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {(doctor.bio || doctor.notable_for) && (
        <p className="mt-7 text-[14px] sm:text-[15px] text-slate-600 leading-relaxed max-w-3xl">
          {doctor.bio || doctor.notable_for}
        </p>
      )}

      {/* Practice locations */}
      {doctor.hospitals && doctor.hospitals.length > 0 && (
        <Section title={`Tempat Praktik · ${doctor.hospitals.length} rumah sakit`}>
          <ul>
            {doctor.hospitals.map((h) => {
              const hospitalSchedules = schedulesByHospital[h.hospital_id]?.items || []
              const hFee = formatFee(h.consultation_fee_min, h.consultation_fee_max, h.currency)
              const hCc = COUNTRY_CODE[h.hospital_country] || h.hospital_country
              const logo = clearbitLogo(undefined) // hospital_id link uses /agent/network/hospitals/[id], website not in payload — fallback icon
              return (
                <li key={h.id}>
                  <Link
                    href={`/agent/network/hospitals/${h.hospital_id}`}
                    className="group flex items-start gap-4 sm:gap-5 py-5 border-b border-gray-100 last:border-b-0 hover:bg-slate-50/60 transition-colors -mx-4 px-4 sm:-mx-6 sm:px-6"
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 text-[15px] leading-snug group-hover:text-slate-700 transition-colors line-clamp-1">
                            {h.hospital_name}
                          </h3>
                          <p className="mt-1 text-[12px] text-slate-500 flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-300" />
                            {h.hospital_city}, {h.hospital_country}
                            {h.is_primary && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Utama</span>
                              </>
                            )}
                            {(h.room_number || h.floor) && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span>
                                  {h.room_number && `Ruang ${h.room_number}`}
                                  {h.room_number && h.floor && " · "}
                                  {h.floor && `Lantai ${h.floor}`}
                                </span>
                              </>
                            )}
                          </p>

                          {hospitalSchedules.length > 0 && (
                            <div className="mt-3 flex gap-1.5 flex-wrap">
                              {hospitalSchedules.map((s) => (
                                <span
                                  key={s.schedule_id}
                                  className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md"
                                >
                                  {DAY_SHORT[s.day_of_week]} · {formatTime(s.start_time)}–{formatTime(s.end_time)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {hFee && <p className="text-[13px] font-semibold text-slate-900">{hFee}</p>}
                          {hFee && <p className="text-[11px] text-slate-400">/ konsultasi</p>}
                          <span className="text-slate-300 text-[11px] font-mono tracking-wider mt-2 inline-block">{hCc}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 mt-1 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
          {!doctor.hospitals.some((h) => formatFee(h.consultation_fee_min, h.consultation_fee_max, h.currency)) && fee && (
            <p className="mt-4 text-[13px] text-slate-500">Estimasi konsultasi: <span className="font-semibold text-slate-900">{fee}</span></p>
          )}
        </Section>
      )}

      {/* Weekly schedule */}
      {Object.keys(schedulesByHospital).length > 0 && (
        <Section title="Jadwal Praktik Mingguan">
          <div className="space-y-7">
            {Object.values(schedulesByHospital).map((group) => (
              <div key={group.id}>
                <h3 className="text-[13px] font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-300" />
                  {group.name}
                </h3>
                <div className="grid grid-cols-7 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const slots = group.items.filter((s) => s.day_of_week === day)
                    const hasSlot = slots.length > 0
                    return (
                      <div
                        key={day}
                        className={`flex flex-col items-center py-3 text-center min-h-[68px] border ${
                          hasSlot ? "border-slate-300 text-slate-700" : "border-dashed border-slate-100 text-slate-300"
                        } rounded-md`}
                      >
                        <p className={`text-[11px] font-semibold ${hasSlot ? "text-slate-700" : "text-slate-300"}`}>{DAY_SHORT[day]}</p>
                        {slots.map((s) => (
                          <p key={s.schedule_id} className="text-[10px] mt-1 leading-tight text-slate-500">
                            {formatTime(s.start_time)}
                            <br />
                            {formatTime(s.end_time)}
                          </p>
                        ))}
                        {!hasSlot && <p className="text-[10px] mt-2">—</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Qualifications */}
      {(doctor.qualifications?.length || 0) + (doctor.certifications?.length || 0) > 0 && (
        <Section title="Kualifikasi & Sertifikasi">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 max-w-3xl">
            {doctor.qualifications?.map((q) => (
              <li key={q} className="flex items-start gap-2 text-[14px] text-slate-700">
                <GraduationCap className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                {q}
              </li>
            ))}
            {doctor.certifications?.map((c) => (
              <li key={c} className="flex items-start gap-2 text-[14px] text-slate-700">
                <GraduationCap className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Conditions */}
      {doctor.conditions_treated && doctor.conditions_treated.length > 0 && (
        <Section title="Kondisi yang Ditangani">
          <div className="flex flex-wrap gap-2">
            {doctor.conditions_treated.map((c) => (
              <span key={c} className="text-[13px] text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">
                {c}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Procedures */}
      {doctor.procedures_offered && doctor.procedures_offered.length > 0 && (
        <Section title="Prosedur & Tindakan">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 max-w-3xl">
            {doctor.procedures_offered.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[14px] text-slate-700">
                <ClipboardList className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Languages */}
      {doctor.languages && doctor.languages.length > 0 && (
        <Section title="Bahasa">
          <p className="text-[14px] text-slate-700">{doctor.languages.join(", ")}</p>
        </Section>
      )}

      {/* Footer spacer */}
      <div className="h-10" />
    </div>
  )
}
