import React from "react";
import { MarketingLayout } from "@/components/home/marketing-layout";
import { LanguageProvider } from "@/lib/language-context";
import { AnimatedStep } from "@/components/home/AnimatedStep";
import { HospitalMarquee } from "@/components/home/HospitalMarquee";
import { HeroSection } from "@/components/home/HeroSection";
import { FadeIn, StaggerFadeIn, FadeInHeading } from "@/components/home/FadeIn";
import { PixelDivider } from "@/components/home/PixelDivider";
import Link from "next/link";
import {
  ArrowRight,
  Users,
  Building2,
  FileText,
  BarChart3,
  Shield,
  Brain,
  Clock,
  PhoneCall,
} from "lucide-react";

export default function Home() {
  return (
    <LanguageProvider>
      <MarketingLayout>
        <div className="-mt-24">
          <HeroSection />
          <HospitalMarquee />
          <StatsSection />
          <SolutionsSection />

          {/* white → dark: grid transitions */}
          <PixelDivider
            fromClassName="bg-white"
            pixelClassName="bg-[#080808]"
            maxFill={1}
          />

          <AISection />

          {/* dark → gray: pixels reveal the features section */}
          <PixelDivider
            fromClassName="bg-[#080808]"
            pixelClassName="bg-gray-50"
            maxFill={1}
          />

          <FeaturesSection />

          <HowItWorksSection />
          
          {/* white → blue: pixels reveal the CTA section */}
          <PixelDivider
            fromClassName="bg-white"
            pixelClassName="bg-blue-600"
            maxFill={1}
          />

          <CTASection />
        </div>
      </MarketingLayout>
    </LanguageProvider>
  );
}

/* ─── STATS ─────────────────────────────────────────────────── */
function StatsSection() {
  const stats = [
    { value: "10.000+", label: "Agen Aktif" },
    { value: "350+",    label: "Rumah Sakit Mitra" },
    { value: "2 Juta+", label: "Klaim Diproses" },
    { value: "98,6%",   label: "Kepuasan Pengguna" },
  ];

  return (
    <section className="bg-white py-10 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn className="h-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="px-4 py-8 sm:px-10 sm:py-10 text-center relative bg-white rounded-none hover:bg-gray-50 transition-colors duration-300 h-full flex flex-col justify-center items-center"
              >
                <div
                  className="absolute inset-0 opacity-20 mask-image-linear-to-b"
                  style={{
                    backgroundImage: "radial-gradient(rgba(37,99,235,0.18) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />
                <p className="relative text-3xl sm:text-5xl font-black text-black tracking-tight leading-none mb-1 sm:mb-2">
                  {s.value}
                </p>
                <p className="relative text-xs sm:text-sm text-gray-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── SOLUTIONS ──────────────────────────────────────────────── */
function SolutionsSection() {
  const portals = [
    {
      href: "/agent/login",
      bg: "bg-[#1a56db]",
      labelColor: "text-blue-200",
      ctaColor: "text-white",
      icon: <Users className="h-6 w-6 text-white" />,
      iconBg: "bg-white/20",
      label: "Portal Agen",
      title: "Kelola nasabah & klaim dengan mudah",
      desc: "Dashboard lengkap untuk agen: manajemen nasabah, klaim real-time, polis, dan laporan performa.",
      cta: "Masuk sebagai Agen",
    },
    {
      href: "/admin-agency/login",
      bg: "bg-[#1e1b4b]",
      labelColor: "text-violet-300",
      ctaColor: "text-violet-300",
      icon: <BarChart3 className="h-6 w-6 text-violet-300" />,
      iconBg: "bg-white/10",
      label: "Portal Agensi",
      title: "Pantau performa tim secara real-time",
      desc: "Analitik tim, pemantauan klaim, transfer agen, dan laporan bisnis terintegrasi.",
      cta: "Masuk sebagai Agensi",
    },
    {
      href: "/hospital/login",
      bg: "bg-[#064e3b]",
      labelColor: "text-emerald-300",
      ctaColor: "text-emerald-300",
      icon: <Building2 className="h-6 w-6 text-emerald-300" />,
      iconBg: "bg-white/10",
      label: "Portal Rumah Sakit",
      title: "Proses klaim lebih cepat & transparan",
      desc: "Review klaim digital, koordinasi dengan agen, dan kelola jadwal pasien dalam satu tempat.",
      cta: "Masuk sebagai RS",
    },
  ];

  return (
    <section id="solutions" className="bg-white py-16 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10 sm:mb-16">
          <FadeInHeading
            heading={
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[1.05] mb-4">
                Satu ekosistem,
                <br />
                tiga portal.
              </h2>
            }
            sub={
              <p className="text-lg text-gray-400 max-w-md">
                Setiap pemangku kepentingan mendapat ruang kerja yang dirancang khusus.
              </p>
            }
          />
        </div>

        {/* Equal-height cards via grid + h-full */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {portals.map((p, i) => (
            <FadeIn key={p.label} delay={i * 0.12} className="h-full">
              <Link
                href={p.href}
                className={`group relative ${p.bg} rounded-none p-6 sm:p-8 overflow-hidden hover:brightness-110 transition-all duration-300 flex flex-col h-full min-h-[280px]`}
              >
                <div className="relative z-10 flex flex-col h-full">
                  <div className={`w-12 h-12 ${p.iconBg} rounded-none flex items-center justify-center mb-8`}>
                    {p.icon}
                  </div>
                  <p className={`${p.labelColor} text-xs font-bold mb-2`}>{p.label}</p>
                  <h3 className="text-lg sm:text-[22px] font-black text-white leading-snug mb-2 sm:mb-3">{p.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed flex-1 mb-5 sm:mb-8">{p.desc}</p>
                  <span className={`inline-flex items-center gap-2 ${p.ctaColor} font-semibold text-sm group-hover:gap-3 transition-all duration-200 mt-auto`}>
                    {p.cta} <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── AI SECTION ─────────────────────────────────────────────── */
function AISection() {
  const capabilities = [
    "Analisis klaim real-time",
    "Deteksi anomali otomatis",
    "Rekomendasi tindakan prioritas",
    "Aktif 24/7 tanpa jeda",
  ];

  const stats = [
    { value: "2×",   label: "Lebih cepat memproses klaim" },
    { value: "24/7", label: "Selalu aktif, tanpa gangguan" },
    { value: "<2s",  label: "Rata-rata waktu respons AI" },
  ];

  return (
    <section className="bg-[#080808] py-16 sm:py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 sm:gap-16 mb-16 sm:mb-24">
          <div className="lg:col-span-3">
            <FadeIn>
              <h2
                className="font-black text-white leading-[1.02] tracking-tight mb-8"
                style={{ fontSize: "clamp(28px, 6vw, 68px)" }}
              >
                Asisten yang mengerti
                <br />
                bisnis Anda lebih
                <br />
                <span className="text-blue-400">dari siapapun.</span>
              </h2>
              <p className="text-white/30 text-base leading-[1.8] max-w-md">
                Bukan chatbot generik. AsistenQu AI mengakses langsung data
                nasabah, polis, dan klaim Anda untuk memberikan jawaban yang
                bisa langsung ditindaklanjuti.
              </p>
            </FadeIn>
          </div>

          <div className="lg:col-span-2 flex flex-col justify-end">
            <FadeIn delay={0.15} className="space-y-3 h-full flex flex-col justify-center">
              {capabilities.map((item, i) => (
                <div
                  key={item}
                  className="bg-white/[0.02] hover:bg-white/[0.05] p-5 rounded-none flex items-center gap-5 group transition-colors duration-300"
                >
                  <span className="text-white/15 text-[10px] w-6 shrink-0">0{i + 1}</span>
                  <span className="text-white/50 text-sm font-medium group-hover:text-white/80 transition-colors duration-300">
                    {item}
                  </span>
                </div>
              ))}
            </FadeIn>
          </div>
        </div>

        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="py-8 sm:py-10 px-8 bg-white/[0.02] rounded-none h-full flex flex-col justify-center"
              >
                <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none mb-2 sm:mb-3">
                  {s.value}
                </p>
                <p className="text-white/45 text-xs sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── FEATURES ───────────────────────────────────────────────── */
function FeaturesSection() {
  const features = [
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Klaim Digital End-to-End",
      desc: "Pengajuan hingga approval tanpa kertas. Riwayat lengkap tersimpan otomatis.",
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Manajemen Nasabah Terpusat",
      desc: "Database nasabah terpadu dengan riwayat polis, klaim, dan kontak.",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Analitik Real-Time",
      desc: "Dashboard visual dengan grafik performa dan metrik bisnis terupdate.",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Keamanan Kelas Enterprise",
      desc: "Enkripsi end-to-end dan audit trail lengkap sesuai regulasi OJK.",
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "AI yang Kontekstual",
      desc: "Asisten AI dengan akses langsung ke data Anda, bukan jawaban generik.",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Visit LOG & Notifikasi",
      desc: "Notifikasi kunjungan ke RS sebelum pasien tiba, konversi ke klaim langsung.",
    },
  ];

  return (
    <section id="features" className="bg-gray-50 py-16 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10 sm:mb-16">
          <FadeInHeading
            heading={
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[1.05] mb-4">
                Semua yang Anda butuhkan.
                <br />
                <span className="text-blue-600">Tidak lebih, tidak kurang.</span>
              </h2>
            }
            sub={
              <p className="text-lg text-gray-400 max-w-md">
                Dirancang khusus untuk industri asuransi Indonesia.
              </p>
            }
          />
        </div>

        <StaggerFadeIn
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch"
          stagger={0.08}
        >
          {features.map((feat) => (
            <div key={feat.title} className="bg-white rounded-none shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-shadow duration-300 p-6 sm:p-8 group h-full flex flex-col">
              <div className="w-10 h-10 bg-gray-50 rounded-none flex items-center justify-center text-black mb-5 group-hover:bg-white group-hover:text-blue-600 transition-colors duration-300 shrink-0">
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-black mb-2">{feat.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">{feat.desc}</p>
            </div>
          ))}
        </StaggerFadeIn>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ───────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Agensi Mendaftar",
      desc: "Pimpinan agensi mendaftarkan organisasinya ke AsistenQu. Proses verifikasi cepat, akun aktif dalam 1×24 jam.",
      delay: 0,
    },
    {
      number: "02",
      title: "Onboarding Agen",
      desc: "Agensi menambahkan agen ke platform. Setiap agen mendapat akun dan dashboard personal mereka sendiri.",
      delay: 150,
    },
    {
      number: "03",
      title: "Operasional Berjalan",
      desc: "Agen kelola nasabah dan klaim, agensi pantau performa, rumah sakit proses klaim. Semua terhubung.",
      delay: 300,
    },
  ];

  return (
    <section id="how" className="bg-white py-16 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10 sm:mb-16">
          <FadeInHeading
            heading={
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[1.05] mb-4">
                Mulai dalam
                <br />
                3 langkah.
              </h2>
            }
            sub={
              <p className="text-lg text-gray-400 max-w-md">
                Tidak perlu setup rumit. Agensi Anda bisa langsung beroperasi.
              </p>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {steps.map((step) => (
            <div
              key={step.number}
              className="p-8 sm:p-10 bg-white rounded-none h-full flex flex-col"
            >
              <AnimatedStep
                number={step.number}
                title={step.title}
                desc={step.desc}
                delay={step.delay}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ────────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section id="contact" className="bg-blue-600 py-16 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] mb-5">
              Siap membawa agensi Anda ke level berikutnya?
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Hubungi kami dan tim kami akan membantu proses onboarding
              agensi Anda dari awal hingga siap beroperasi.
            </p>
          </FadeIn>
          <FadeIn delay={0.15} className="flex flex-col gap-4">
            <Link
              href="mailto:hello@asistenqu.com"
              className="group inline-flex items-center justify-between bg-white hover:bg-gray-50 text-blue-700 font-bold px-5 sm:px-8 py-4 sm:py-5 rounded-none transition-colors duration-200 text-base sm:text-lg"
            >
              <span className="flex items-center gap-3">
                <PhoneCall className="h-5 w-5" />
                Hubungi Tim Kami
              </span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/admin-agency/login"
              className="inline-flex items-center justify-between bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 font-bold px-5 sm:px-8 py-4 sm:py-5 rounded-none transition-colors duration-200 text-base sm:text-lg"
            >
              Sudah punya akun? Masuk
              <ArrowRight className="h-5 w-5" />
            </Link>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
