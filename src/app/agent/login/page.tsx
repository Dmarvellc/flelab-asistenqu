"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Loader2, Zap, ArrowRight } from "lucide-react";

export default function AgentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Login gagal");
        setLoading(false);
        return;
      }

      if (data.user?.role !== "agent") {
        setError("Akun ini tidak memiliki akses sebagai agen.");
        setLoading(false);
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/agent");
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan yang tidak terduga.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[#0a0a0a] border-r border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center">
            <Zap className="h-5 w-5 text-black" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-none">Portal Agen</p>
            <p className="text-[10px] text-white/30 mt-0.5">AsistenQu</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Kelola klien &<br />klaim dengan mudah.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            Dashboard agen terpadu untuk memantau nasabah, klaim asuransi, dan permintaan data secara real-time.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: "Klien Aktif", value: "2.4K+" },
              { label: "Klaim Diproses", value: "98%" },
              { label: "Respons Cepat", value: "<2j" },
            ].map((s) => (
              <div key={s.label} className="border border-white/[0.08] rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/30 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-xs">© 2026 AsistenQu. All rights reserved.</p>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#f5f5f5]">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="h-8 w-8 rounded-xl bg-black flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <p className="font-semibold text-gray-900">Portal Agen</p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Selamat datang kembali</h1>
            <p className="text-sm text-gray-500 mt-1">Masuk untuk mengakses dashboard agen Anda.</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 mb-6 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl border-gray-200 bg-white text-sm focus:border-gray-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Kata Sandi
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-11 pr-11 rounded-xl border-gray-200 bg-white text-sm focus:border-gray-400 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-150 ${rememberMe ? "bg-black border-black" : "border-gray-300 bg-white"}`}>
                    {rememberMe && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500">Ingat Saya</span>
              </label>
              <Link
                href="#"
                className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Lupa kata sandi?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-black hover:bg-gray-900 text-white font-semibold gap-2 mt-2 transition-all duration-200 shadow-sm hover:shadow-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Masuk...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Belum punya akun?{" "}
            <Link href="/agent/register" className="font-semibold text-gray-900 hover:underline underline-offset-4">
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
