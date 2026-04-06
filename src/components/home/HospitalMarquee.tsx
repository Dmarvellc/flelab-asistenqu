"use client"

import Image from "next/image"
import { useState } from "react"

interface Hospital {
  name: string
  logoUrl: string
  w: number
  h: number
}

/* All 13 real logos in one row */
const hospitals: Hospital[] = [
  {
    name: "Siloam Hospitals",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Siloam_Hospitals.svg/300px-Siloam_Hospitals.svg.png",
    w: 120, h: 32,
  },
  {
    name: "Gleneagles Penang",
    logoUrl: "https://gleneagles.com.my/images/default-source/my-gh/logo/gleneagles_logo_260px.webp",
    w: 140, h: 36,
  },
  {
    name: "Mayapada Hospital",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Logo_Mayapada_Hospital.png/300px-Logo_Mayapada_Hospital.png",
    w: 120, h: 36,
  },
  {
    name: "Mitra Keluarga",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Mitra_Keluarga_2014.svg/300px-Mitra_Keluarga_2014.svg.png",
    w: 130, h: 36,
  },
  {
    name: "RS Pondok Indah",
    logoUrl: "https://www.rspondokindah.co.id/images/logo_rspi.svg",
    w: 110, h: 36,
  },
  {
    name: "Prince Court Medical",
    logoUrl: "https://princecourt.com/images/default-source/my_pcmc/header-footer/bottom-header/prince-court-logo.webp?v=1",
    w: 140, h: 36,
  },
  {
    name: "RSUP Fatmawati",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Logo-rs-fatmawati.png/300px-Logo-rs-fatmawati.png",
    w: 100, h: 36,
  },
  {
    name: "RS Awal Bros",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/RS_Awal_Bros_merah.png/300px-RS_Awal_Bros_merah.png",
    w: 120, h: 36,
  },
  {
    name: "Pantai Hospitals",
    logoUrl: "https://www.pantai.com.my/images/default-source/my-ph/logo/pantai_logo.webp",
    w: 120, h: 36,
  },
  {
    name: "Sunway Medical",
    logoUrl: "https://www.sunwaymedical.com/images/uploads/layout/SUN_logo-20.png",
    w: 130, h: 36,
  },
  {
    name: "Thomson Medical",
    logoUrl: "https://images.contentstack.io/v3/assets/blt5f400315f9e4f0b3/bltea2bd9a69e5a9b64/65164c968286ce01040fa3af/desktop_logo.svg?branch=production",
    w: 130, h: 36,
  },
  {
    name: "Columbia Asia",
    logoUrl: "https://www.columbiaasia.com/include/img/cah-new-global-logo-2.png",
    w: 130, h: 36,
  },
  {
    name: "IHH Healthcare",
    logoUrl: "https://ihh.listedcompany.com/ihh/assets/images/reskin/logo-ihh.svg",
    w: 100, h: 36,
  },
]

function LogoItem({ hospital }: { hospital: Hospital }) {
  const [error, setError] = useState(false)
  if (error) return null

  return (
    <span className="inline-flex items-center justify-center shrink-0 px-10 cursor-default group">
      <Image
        src={hospital.logoUrl}
        alt={hospital.name}
        width={hospital.w}
        height={hospital.h}
        className="object-contain grayscale opacity-55 hover:opacity-90 hover:grayscale-0 transition-all duration-500 max-h-9 w-auto"
        onError={() => setError(true)}
        unoptimized
      />
    </span>
  )
}

export function HospitalMarquee() {
  /* triple-repeat so the seamless loop works at any viewport width */
  const items = [...hospitals, ...hospitals, ...hospitals]

  return (
    <section className="bg-white py-8 sm:py-14 overflow-hidden border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6 sm:mb-10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-300">
          Jaringan rumah sakit &amp; mitra terpercaya
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-40 z-10 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-40 z-10 bg-gradient-to-l from-white to-transparent" />

        <div className="flex animate-marquee items-center whitespace-nowrap w-max">
          {items.map((h, i) => <LogoItem key={i} hospital={h} />)}
        </div>
      </div>
    </section>
  )
}
