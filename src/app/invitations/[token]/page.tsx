"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building2,
  Mail,
  Clock,
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
      // Auto-redirect to the agency login after a short pause
      setTimeout(() => {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (loadErr || !preview) {
    return (
      <Wrap>
        <div className="text-center space-y-3">
          <XCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Undangan tidak valid</h2>
          <p className="text-sm text-gray-500">{loadErr ?? "Link tidak ditemukan."}</p>
          <Link href="/" className="inline-block text-sm text-gray-900 underline">
            Kembali ke beranda
          </Link>
        </div>
      </Wrap>
    );
  }

  if (preview.status !== "pending") {
    const msg: Record<string, string> = {
      accepted: "Undangan ini sudah digunakan.",
      revoked: "Undangan ini sudah dicabut oleh admin.",
      expired: "Undangan ini sudah kedaluwarsa. Minta admin mengirim ulang.",
    };
    return (
      <Wrap>
        <div className="text-center space-y-3">
          <Clock className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Tidak bisa diproses</h2>
          <p className="text-sm text-gray-500">{msg[preview.status]}</p>
        </div>
      </Wrap>
    );
  }

  if (done) {
    return (
      <Wrap>
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Akun siap</h2>
          <p className="text-sm text-gray-500">
            Mengarahkan ke halaman login...
          </p>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      {/* Agency context */}
      <div className="flex items-start gap-3 pb-5 border-b border-gray-100">
        <div className="h-11 w-11 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
            Undangan bergabung
          </p>
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {preview.agency_name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-900 text-white">
              <ShieldCheck className="h-3 w-3" />
              {ROLE_LABEL[preview.agency_role]}
            </span>
            <span className="text-xs text-gray-500 truncate flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {preview.email}
            </span>
          </div>
        </div>
      </div>

      {preview.invited_by_email && (
        <p className="text-xs text-gray-500 mt-4">
          Diundang oleh{" "}
          <span className="font-medium text-gray-900">{preview.invited_by_email}</span>.
          Link berlaku sampai{" "}
          {new Date(preview.expires_at).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          .
        </p>
      )}

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Nama lengkap</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama lengkap sesuai KTP"
          />
        </div>
        <div className="space-y-1.5">
          <Label>No. HP / WhatsApp (opsional)</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+62812..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 karakter"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Konfirmasi password</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ulangi password"
          />
        </div>

        {err && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {err}
          </p>
        )}

        <Button
          className="w-full"
          onClick={submit}
          disabled={submitting || !password || !confirm}
        >
          {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Aktifkan Akun
        </Button>
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
