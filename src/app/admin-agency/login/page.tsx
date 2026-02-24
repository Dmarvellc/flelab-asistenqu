"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Loader2, ArrowRight, Shield } from "lucide-react";

export default function AdminAgencyLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Login gagal");
        setLoading(false);
        return;
      }

      // Check role
      if (
        data.user?.role !== "admin_agency" &&
        data.user?.role !== "insurance_admin" &&
        data.user?.role !== "super_admin"
      ) {
        setError("Akun ini tidak memiliki akses sebagai admin agency.");
        setLoading(false);
        return;
      }

      router.push("/admin-agency");
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan yang tidak terduga.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">

      {/* Background Decorative */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-black/[0.02] rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-black/[0.03] rounded-full blur-[80px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Top Logo */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20">
        <img
          src="https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_logotext.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX2xvZ290ZXh0LnBuZyIsImlhdCI6MTc3MTkwMjgxNywiZXhwIjozMzI3NjM2NjgxN30.BDtpL6pQ6FhAGQF3V05PMC3gHkJ44R2O4vm3yfY2iyQ"
          alt="AsistenQu Logo"
          className="h-10 w-auto object-contain"
        />
      </div>

      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 bg-white p-8 rounded-3xl shadow-2xl shadow-black/5 border border-white/20">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Login Portal Agency</h1>
          <p className="text-sm text-gray-500 mt-2 text-center">Masuk ke dashboard manajemen operasional agensi untuk melanjutkan.</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 mb-6 animate-in zoom-in-95 duration-200">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              ALAMAT EMAIL
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="agency@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-12 rounded-xl border-gray-200 bg-gray-50 text-sm focus:border-black focus:ring-black focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              KATA SANDI
            </Label>
            <div className="relative group">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-12 pr-12 rounded-xl border-gray-200 bg-gray-50 text-sm focus:border-black focus:ring-black focus:bg-white transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-gray-600 hover:bg-gray-100 transition-all"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-black hover:bg-gray-900 text-white font-semibold gap-2 mt-4 transition-all duration-300 shadow-lg shadow-black/10 hover:shadow-black/20 hover:-translate-y-0.5"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat...
              </>
            ) : (
              <>
                Masuk Dashboard
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8 pt-6 border-t border-gray-100">
          Mengalami kendala login?{" "}
          <Link href="#" className="font-semibold text-black hover:underline underline-offset-4 transition-all">
            Hubungi Support
          </Link>
        </p>
      </div>
    </div>
  );
}
