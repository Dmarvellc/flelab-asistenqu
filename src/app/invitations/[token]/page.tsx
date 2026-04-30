"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";


/**
 * Public landing for /invitations/<token>.
 * Shows agency + role context, lets invitee set a password and accept.
 */

type Preview = {
  invitation_id: string;
  email: string;
  full_name: string | null;
  agency_role: "master_admin" | "admin" | "manager" | "agent";
  agency_name: string;
  agency_slug: string | null;
  invited_by_email: string | null;
  expires_at: string;
  status: "pending" | "accepted" | "revoked" | "expired";
};

const ROLE_LABEL: Record<Preview["agency_role"], string> = {
  master_admin: "Master Admin",
  admin: "Admin Agency",
  manager: "Manager",
  agent: "Agen",
};

export default function InvitationLandingPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeTos, setAgreeTos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/invitations/${token}`, { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Undangan tidak valid");
        setPreview(j.invitation as Preview);
        setFullName(j.invitation.full_name ?? "");
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : "Gagal memuat undangan");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submit = async () => {
    setErr(null);
    if (password.length < 8) {
      setErr("Password minimum 8 karakter");
      return;
    }
    if (password !== confirm) {
      setErr("Konfirmasi password tidak cocok");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          fullName: fullName.trim() || undefined,
          phoneNumber: phone.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal memproses undangan");
      setDone(true);
      // Auto-redirect after a short pause.
      // master_admin / admin / manager → /admin-agency/login  (agency operators)
      // agent                           → /{slug}/agent/login (or /agent/login)
      setTimeout(() => {
        const role = preview?.agency_role;
        if (role && role !== "agent") {
          router.push("/admin-agency/login");
          return;
        }
        if (preview?.agency_slug) {
          router.push(`/${preview.agency_slug}/agent/login`);
        } else {
          router.push("/agent/login");
        }
      }, 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memproses undangan");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111]">
        <Loader2 className="h-6 w-6 animate-spin text-[#555555]" />
      </div>
    );
  }

  if (loadErr || !preview) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-6 text-center font-serif">
        <div className="space-y-4">
          <h2 className="text-2xl text-white font-medium">Link tidak valid</h2>
          <p className="text-[#888888]">{loadErr ?? "Undangan tidak ditemukan."}</p>
          <Link href="/" className="inline-block pt-4 text-[#CCCCCC] hover:text-white underline transition-colors">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  if (preview.status !== "pending") {
    const msg: Record<string, string> = {
      accepted: "Undangan ini sudah digunakan.",
      revoked: "Undangan ini sudah dicabut oleh admin.",
      expired: "Undangan ini sudah kedaluwarsa. Minta admin mengirim ulang.",
    };
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-6 text-center font-serif">
        <div className="space-y-4">
          <h2 className="text-2xl text-white font-medium">Tidak bisa diproses</h2>
          <p className="text-[#888888]">{msg[preview.status]}</p>
        </div>
      </div>
    );
  }

  if (done) {
    const isStaff = preview?.agency_role && preview.agency_role !== "agent";
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-6 text-center font-serif">
        <div className="space-y-4">
          <CheckCircle2 className="h-8 w-8 text-white mx-auto mb-2" />
          <h2 className="text-2xl text-white font-medium">Akun siap</h2>
          <p className="text-[#888888]">
            {isStaff
              ? "Mengarahkan ke dashboard Admin Agency…"
              : "Mengarahkan ke halaman login agen…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center p-6 sm:p-12 font-serif text-[#1C1C1C]">
      {/* Top Center Logo */}
      <div className="w-full max-w-lg flex justify-center mb-16">
        <Logo height={32} />
      </div>

      <div className="w-full max-w-lg space-y-12">
        {/* Header / Context */}
        <div className="space-y-4">
          <p className="text-sm tracking-widest text-[#666666] uppercase mb-4">
            Undangan Bergabung
          </p>
          <h1 className="text-4xl leading-tight font-medium text-black">
            {preview.agency_name}
          </h1>
          <p className="text-base text-[#444444] leading-relaxed">
            Anda diundang untuk bergabung menjadi <span className="text-black font-medium">{ROLE_LABEL[preview.agency_role]}</span>.
            <br />Undangan ini dikirimkan untuk akun Gmail / email: <strong className="text-black">{preview.email}</strong>.
            <br />Berlaku hingga {new Date(preview.expires_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric"
            })}.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#666666]">Nama lengkap</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sesuai KTP"
              className="h-12 bg-transparent border-0 border-b border-[#CCCCCC] rounded-none px-0 focus-visible:ring-0 focus-visible:border-black text-base text-black placeholder:text-[#999999]"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#666666]">No. HP / WhatsApp (opsional)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+62812..."
              className="h-12 bg-transparent border-0 border-b border-[#CCCCCC] rounded-none px-0 focus-visible:ring-0 focus-visible:border-black text-base text-black placeholder:text-[#999999]"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#666666]">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 karakter"
              className="h-12 bg-transparent border-0 border-b border-[#CCCCCC] rounded-none px-0 focus-visible:ring-0 focus-visible:border-black text-base text-black placeholder:text-[#999999]"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#666666]">Konfirmasi password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ulangi password"
              className="h-12 bg-transparent border-0 border-b border-[#CCCCCC] rounded-none px-0 focus-visible:ring-0 focus-visible:border-black text-base text-black placeholder:text-[#999999]"
            />
          </div>

          {err && (
            <p className="text-sm text-red-600 pt-2">
              {err}
            </p>
          )}

          <div className="flex items-start space-x-3 pt-2">
            <input 
              type="checkbox"
              id="tos"
              checked={agreeTos}
              onChange={(e) => setAgreeTos(e.target.checked)}
              className="mt-1 h-4 w-4 border-[#CCCCCC] rounded-sm text-black focus:ring-black accent-black cursor-pointer" 
            />
            <div className="space-y-1">
              <label htmlFor="tos" className="text-sm font-medium text-[#444444] cursor-pointer">
                Saya menyetujui Syarat dan Ketentuan layanan ini
              </label>
              <p className="text-xs text-[#888888]">
                Semua informasi dan formulir dienkripsi penuh dengan standar keamanan tinggi untuk menjaga privasi Anda.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button
              className="w-full h-12 rounded-none bg-black hover:bg-[#333333] text-white text-base font-medium transition-colors"
              onClick={submit}
              disabled={submitting || !password || !confirm || !agreeTos}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />}
              Aktifkan Akun
            </Button>
            <div className="flex items-center justify-center space-x-1.5 mt-4 text-[#888888]">
              <Lock className="w-3.5 h-3.5" />
              <span className="text-xs">Formulir Terenkripsi Aman</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
