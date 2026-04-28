"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Building2, MapPin, Star, Shield, Globe2, Stethoscope, Phone,
  ExternalLink, Clock, Award, Users, Zap, Heart, ChevronRight, BadgeCheck,
  Wifi, Video, Activity, Cpu, Microscope, Bed, Calendar, Languages
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Types ──────────────────────────────────────────────────
interface Hospital {
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
  operating_hours: string | null
}

interface Doctor {
  id: string
  name: string
  title: string
  specialization: string
  subspecialization: string | null
  hospital: string
  experience_years: number
  rating: number
  is_featured: boolean
  notable_for: string | null
  consultation_fee_min: number
  consultation_fee_max: number
  currency: string
  telemedicine_available: boolean
  qualifications: string[]
  procedures_offered: string[]
  conditions_treated: string[]
}

interface Facility {
  facility_id: string
  category: string
  name: string
  description: string | null
  is_highlighted: boolean
}

interface InsurancePanel {
  panel_id: string
  insurance_name: string
  panel_type: string
}

const COUNTRY_FLAG: Record<string, string> = {
  Singapore: "🇸🇬", Malaysia: "🇲🇾", Indonesia: "🇮🇩", Thailand: "🇹🇭", India: "🇮🇳",
}

const CURRENCY_SYMBOL: Record<string, string> = {
  IDR: "Rp", MYR: "RM", SGD: "S$", THB: "฿", INR: "₹",
}

const FACILITY_ICONS: Record<string, React.ElementType> = {
  Surgical: Cpu,
  Diagnostic: Microscope,
  Treatment: Zap,
  Patient: Users,
}

function formatFee(min?: number, max?: number, currency?: string): string {
  if (!min || !max || !currency) return ""
  const sym = CURRENCY_SYMBOL[currency] || currency
  if (currency === "IDR") return `${sym}${(min / 1000).toFixed(0)}–${(max / 1000).toFixed(0)}rb`
  return `${sym}${min}–${max}`
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
export default function HospitalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [panels, setPanels] = useState<InsurancePanel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/network/hospitals/${id}`)
      .then(r => r.json())
      .then(data => {
        setHospital(data.hospital)
        setDoctors(data.doctors || [])
        setFacilities(data.facilities || [])
        setPanels(data.insurance_panels || [])
      })
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

  if (!hospital) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-bold text-gray-900 mb-2">Rumah sakit tidak ditemukan</p>
        <Button variant="outline" onClick={() => router.back()}>Kembali</Button>
      </div>
    )
  }

  const flag = COUNTRY_FLAG[hospital.country] || ""
  const highlightedFacilities = facilities.filter(f => f.is_highlighted)
  const groupedFacilities = facilities.reduce<Record<string, Facility[]>>((acc, f) => {
    ;(acc[f.category] ??= []).push(f)
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
        Kembali ke Jaringan
      </button>

      {/* ── Hero Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gray-900 p-6 sm:p-10">
        <div className="relative z-10 flex flex-col gap-4">
          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {hospital.tier === "PREMIUM" && (
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-200 bg-amber-500/20 border border-amber-400/30 px-2.5 py-1 rounded-full">Premium</span>
            )}
            {hospital.accreditations?.map(a => (
              <span key={a} className="text-[10px] font-bold tracking-wider uppercase text-blue-200 bg-blue-500/20 border border-blue-400/30 px-2.5 py-1 rounded-full">{a}</span>
            ))}
            {hospital.is_partner && (
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-200 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-full">Mitra AsistenQu</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">{hospital.name}</h1>
          <p className="text-sm text-white/60 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0" />
            {hospital.address} {flag}
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-white font-bold">{parseFloat(String(hospital.avg_rating)).toFixed(1)}</span>
              <span className="text-white/40 text-sm">({hospital.total_reviews?.toLocaleString()} ulasan)</span>
            </div>
            {hospital.bed_count > 0 && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Bed className="h-4 w-4" /> {hospital.bed_count} tempat tidur
              </div>
            )}
            {hospital.established_year > 0 && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Calendar className="h-4 w-4" /> Berdiri {hospital.established_year}
              </div>
            )}
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Stethoscope className="h-4 w-4" /> {doctors.length} Dokter
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3 mt-3">
            {hospital.phone && (
              <a
                href={`tel:${hospital.phone}`}
                className="flex items-center gap-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl border border-white/10 transition-all"
              >
                <Phone className="h-4 w-4" /> {hospital.phone}
              </a>
            )}
            {hospital.website && (
              <a
                href={hospital.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl border border-white/10 transition-all"
              >
                <ExternalLink className="h-4 w-4" /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Features strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {hospital.emergency_24h && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl p-4">
            <Clock className="h-5 w-5 text-green-600 shrink-0" />
            <div><p className="text-xs font-bold text-green-900">24/7 Emergency</p><p className="text-[10px] text-green-600">IGD tersedia</p></div>
          </div>
        )}
        {hospital.international_patients && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <Globe2 className="h-5 w-5 text-blue-600 shrink-0" />
            <div><p className="text-xs font-bold text-blue-900">Pasien Internasional</p><p className="text-[10px] text-blue-600">Layanan khusus</p></div>
          </div>
        )}
        {hospital.insurance_panel && (
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl p-4">
            <Shield className="h-5 w-5 text-purple-600 shrink-0" />
            <div><p className="text-xs font-bold text-purple-900">Panel Asuransi</p><p className="text-[10px] text-purple-600">Cashless tersedia</p></div>
          </div>
        )}
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
          <Building2 className="h-5 w-5 text-gray-600 shrink-0" />
          <div><p className="text-xs font-bold text-gray-900">{hospital.type}</p><p className="text-[10px] text-gray-500">{hospital.tier} Tier</p></div>
        </div>
      </div>

      {/* ── Description ── */}
      {hospital.description && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6">
          <p className="text-sm text-gray-600 leading-relaxed">{hospital.description}</p>
        </div>
      )}

      {/* ── Two Column: Technologies + Languages ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Technologies */}
        {hospital.technologies && hospital.technologies.length > 0 && (
          <Section title="Teknologi Medis" icon={Cpu}>
            <div className="flex flex-wrap gap-2">
              {hospital.technologies.map(t => (
                <span key={t} className="text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-500" /> {t}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Languages */}
        {hospital.languages_supported && hospital.languages_supported.length > 0 && (
          <Section title="Bahasa yang Didukung" icon={Languages}>
            <div className="flex flex-wrap gap-2">
              {hospital.languages_supported.map(l => (
                <span key={l} className="text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">{l}</span>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* ── Specializations ── */}
      {hospital.specializations && hospital.specializations.length > 0 && (
        <Section title="Pusat Keunggulan" icon={Award}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {hospital.specializations.map(s => (
              <div key={s} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <BadgeCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-medium text-gray-700">{s}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Facilities ── */}
      {facilities.length > 0 && (
        <Section title={`Fasilitas & Peralatan (${facilities.length})`} icon={Cpu}>
          <div className="flex flex-col gap-6">
            {Object.entries(groupedFacilities).map(([category, items]) => {
              const Icon = FACILITY_ICONS[category] || Activity
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{category}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map(f => (
                      <div
                        key={f.facility_id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                          f.is_highlighted
                            ? "bg-amber-50/50 border-amber-100"
                            : "bg-gray-50/50 border-gray-100"
                        }`}
                      >
                        {f.is_highlighted && <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                        <div>
                          <p className={`text-xs font-semibold ${f.is_highlighted ? "text-amber-900" : "text-gray-800"}`}>{f.name}</p>
                          {f.description && <p className="text-[11px] text-gray-500 mt-0.5">{f.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Insurance Panels ── */}
      {panels.length > 0 && (
        <Section title={`Panel Asuransi (${panels.length})`} icon={Shield}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {panels.map(p => (
              <div key={p.panel_id} className="flex items-center gap-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <Shield className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-800">{p.insurance_name}</p>
                  <p className="text-[10px] text-purple-500 uppercase font-bold">{p.panel_type}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Doctors ── */}
      {doctors.length > 0 && (
        <Section title={`Dokter Spesialis (${doctors.length})`} icon={Stethoscope}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map(d => {
              const fee = formatFee(d.consultation_fee_min, d.consultation_fee_max, d.currency)
              return (
                <div key={d.id} className="flex flex-col gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-gray-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-gray-400 truncate">{d.title}</p>
                      <h4 className="text-sm font-semibold text-gray-900 mt-0.5">{d.name}</h4>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {d.is_featured && <span className="text-[9px] font-bold tracking-wider uppercase text-white bg-gray-900 px-2 py-0.5 rounded-full">Top</span>}
                      {d.telemedicine_available && <Video className="h-3.5 w-3.5 text-blue-500" />}
                    </div>
                  </div>

                  <span className="inline-flex w-fit text-[10px] font-medium text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                    {d.specialization}{d.subspecialization && ` · ${d.subspecialization}`}
                  </span>

                  {d.notable_for && <p className="text-[11px] text-gray-500 line-clamp-2">{d.notable_for}</p>}

                  {/* Conditions */}
                  {d.conditions_treated && d.conditions_treated.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {d.conditions_treated.slice(0, 3).map(c => (
                        <span key={c} className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                      {d.conditions_treated.length > 3 && <span className="text-[9px] text-gray-400">+{d.conditions_treated.length - 3}</span>}
                    </div>
                  )}

                  {/* Qualifications */}
                  {d.qualifications && d.qualifications.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {d.qualifications.slice(0, 2).map(q => (
                        <span key={q} className="text-[9px] text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{q}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-gray-900 text-gray-900" />
                        <span className="text-xs font-bold text-gray-900">{parseFloat(String(d.rating)).toFixed(1)}</span>
                      </div>
                      {d.experience_years && <span className="text-[10px] text-gray-400">{d.experience_years} thn</span>}
                    </div>
                    {fee && <span className="text-[10px] text-gray-500 font-medium">{fee}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
