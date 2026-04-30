"use client"

import Link from "next/link"
import { Logo } from "@/components/ui/logo"

export function Footer() {
  const navLinks = [
    { label: "Fitur", href: "#features" },
    { label: "Cara Kerja", href: "#how" },
    { label: "Portal Agen", href: "/agent/login" },
    { label: "Portal Agensi", href: "/admin-agency/login" },
    { label: "Portal Rumah Sakit", href: "/hospital/login" },
    { label: "Status Server", href: "/status" },
  ]

  return (
    <footer className="bg-[#0a0a0a] text-white/40">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/8 pb-8 mb-6">
          {/* Brand */}
          <Link href="/" className="hover:opacity-70 transition-opacity shrink-0">
            <Logo height={32} light />
          </Link>

          {/* Nav links — horizontal */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} AsistenQu. Seluruh hak dilindungi.</p>
        </div>
      </div>
    </footer>
  )
}
