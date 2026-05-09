"use client";

import { useRef, useState } from "react";
import {
  Upload, FileText, CheckCircle2, AlertCircle, X,
  Download, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}

interface ImportError {
  row: number;
  reason: string;
  data: Record<string, string>;
}

interface ImportResult {
  summary: ImportSummary;
  errors: ImportError[];
}

const TEMPLATE_HEADERS = [
  "full_name", "nik", "phone", "email", "address",
  "birth_date", "gender", "policy_number", "product_name",
  "insurance_company", "start_date", "end_date", "premium_amount", "agent_email",
];

const TEMPLATE_EXAMPLE = [
  "Budi Santoso", "3201234567890001", "08123456789", "budi@email.com",
  "Jl. Merdeka No. 1 Jakarta", "1990-01-15", "L", "POL-001",
  "Asuransi Jiwa Plus", "PT Asuransi XYZ", "2024-01-01", "2025-01-01",
  "500000", "",
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS.join(","), TEMPLATE_EXAMPLE.join(",")];
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_import_klien.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ClientImportPanel({ onSuccess }: { onSuccess?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) {
      toast({ title: "Format tidak didukung", description: "Hanya file .csv yang diterima", variant: "destructive" });
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin-agency/clients/import", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) {
        toast({ title: "Gagal", description: json.error ?? "Upload gagal", variant: "destructive" });
        return;
      }

      setResult(json);
      if (json.summary.imported > 0 && onSuccess) onSuccess();

      toast({
        title: `Import selesai`,
        description: `${json.summary.imported} klien berhasil diimpor${json.summary.errors > 0 ? `, ${json.summary.errors} baris gagal` : ""}`,
        variant: json.summary.errors > 0 ? "destructive" : "default",
      });
    } catch {
      toast({ title: "Error", description: "Koneksi gagal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + download template */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Upload file CSV</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Maks. 15.000 baris per upload. Kolom wajib: <code className="bg-gray-100 px-1 rounded">full_name</code>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs gap-1.5">
          <Download className="w-3 h-3" /> Template CSV
        </Button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50",
          file ? "border-green-300 bg-green-50/30" : "",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-green-600 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
              className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-600 font-medium">Drop file CSV di sini atau klik untuk pilih</p>
            <p className="text-xs text-gray-400">Mendukung kolom Indonesia: nama, NIK, telepon, alamat, dll.</p>
          </div>
        )}
      </div>

      {/* Upload button */}
      {file && !result && (
        <Button onClick={handleUpload} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {loading ? "Mengimpor data..." : "Mulai Import"}
        </Button>
      )}

      {/* Result summary */}
      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total", value: result.summary.total, color: "text-gray-700 bg-gray-50 border-gray-200" },
              { label: "Berhasil", value: result.summary.imported, color: "text-green-700 bg-green-50 border-green-200" },
              { label: "Dilewati", value: result.summary.skipped, color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
              { label: "Gagal", value: result.summary.errors, color: "text-red-700 bg-red-50 border-red-200" },
            ].map((s) => (
              <div key={s.label} className={cn("rounded-lg border p-3 text-center", s.color)}>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {result.summary.errors > 0 && (
            <div className="border border-red-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-50/50 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {result.summary.errors} baris gagal diimpor
                </span>
                {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showErrors && (
                <div className="max-h-64 overflow-y-auto divide-y divide-red-50">
                  {result.errors.map((err) => (
                    <div key={err.row} className="px-4 py-2.5 text-xs bg-white">
                      <span className="font-mono text-gray-400 mr-2">Baris {err.row}</span>
                      <span className="text-red-600">{err.reason}</span>
                      {err.data.full_name && (
                        <span className="text-gray-400 ml-2">— {err.data.full_name}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {result.summary.imported > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                <strong>{result.summary.imported}</strong> klien berhasil diimpor.
                {result.summary.imported > 0 && ' Klien tanpa agent email sudah masuk tab "Belum Ditugaskan".'}
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => { setFile(null); setResult(null); }}
          >
            Upload file baru
          </Button>
        </div>
      )}
    </div>
  );
}
