"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ClaimData = {
    claim_number: string;
    claim_date: string;
    status: string;
    stage: string;
    total_amount: number;
    plain_notes: string;
    meta: Record<string, string>;
    log_number: string | null;
    log_issued_at: string | null;
    log_sent_to_hospital_at: string | null;
    insurance_name: string | null;
    insurance_contact: string | null;

    client_name: string;
    nik: string | null;
    birth_date: string | null;
    gender: string | null;
    phone_number: string | null;
    address: string | null;

    hospital_name: string | null;
    hospital_address: string | null;
    disease_name: string | null;
    icd10_code: string | null;

    agent_name: string | null;
    agent_email: string;
    agent_referral_code: string | null;

    contract_number: string | null;
    product_name: string | null;
    policy_start: string | null;
    policy_end: string | null;
    premium_amount: number | null;

    coverage_periods: {
        type: string;
        start_date: string;
        end_date: string;
        amount: number | null;
        description: string | null;
        is_eligible: boolean;
    }[];

    created_at: string;
};

function fmt(date?: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
    });
}

function fmtCurrency(amount?: number | null) {
    if (amount == null) return "—";
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR", maximumFractionDigits: 0,
    }).format(amount);
}

/** A print-friendly field row */
function Field({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <tr className="field-row">
            <td className="field-label">{label}</td>
            <td className="field-colon">:</td>
            <td className={`field-value${mono ? " mono" : ""}`}>{value || "—"}</td>
        </tr>
    );
}

/** Status label in Indonesian */
function stageLabel(stage: string) {
    const map: Record<string, string> = {
        DRAFT: "Draft",
        DRAFT_AGENT: "Draft Agent",
        PENDING_LOG: "Menunggu LOG",
        LOG_ISSUED: "LOG Diterbitkan",
        LOG_SENT_TO_HOSPITAL: "LOG Dikirim RS",
        PENDING_HOSPITAL_INPUT: "Menunggu Input RS",
        PENDING_AGENT_REVIEW: "Review Agen",
        SUBMITTED_TO_AGENCY: "Diajukan ke Agensi",
        APPROVED_BY_AGENCY: "Disetujui",
        REJECTED_BY_AGENCY: "Ditolak",
        APPROVED: "Disetujui",
        REJECTED: "Ditolak",
        SUBMITTED: "Diajukan",
    };
    return map[stage] || stage;
}

export default function ClaimPrintPage() {
    const params = useParams<{ id: string }>();
    const [claim, setClaim] = useState<ClaimData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/agent/claims/${params.id}/pdf-data`)
            .then(r => r.ok ? r.json() : Promise.reject("Failed"))
            .then(d => setClaim(d.claim_data))
            .catch(() => setError("Gagal memuat data klaim."))
            .finally(() => setLoading(false));
    }, [params.id]);

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f5f5" }}>
            <div className="spinner" />
        </div>
    );

    if (error || !claim) return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
            <p style={{ color: "#666" }}>{error || "Data tidak ditemukan"}</p>
            <Link href={`/agent/claims/${params.id}`} style={{ color: "#2563eb", fontSize: 14 }}>← Kembali ke Klaim</Link>
        </div>
    );

    const c = claim;
    const now = new Date().toLocaleDateString("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

    const hasLog = !!c.log_number;
    const isApproved = c.status === "APPROVED" || c.stage === "APPROVED_BY_AGENCY";
    const isRejected = c.status === "REJECTED" || c.stage === "REJECTED_BY_AGENCY";

    return (
        <>
            <style>{`
                *, *::before, *::after { box-sizing: border-box; }

                body {
                    margin: 0; padding: 0;
                    background: #e8e8e8;
                    font-family: "Times New Roman", Times, serif;
                    color: #1a1a1a;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                /* ── Toolbar ── */
                .toolbar {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 10px 28px;
                    background: #1a1a1a;
                    color: #fff;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 13px;
                    box-shadow: 0 2px 12px rgba(0,0,0,.25);
                }
                .toolbar-left { display: flex; align-items: center; gap: 10px; }
                .toolbar-back {
                    display: flex; align-items: center; gap: 6px;
                    color: #ccc; text-decoration: none; font-size: 13px;
                    transition: color .15s;
                }
                .toolbar-back:hover { color: #fff; }
                .claim-badge {
                    background: #333; border-radius: 6px;
                    padding: 3px 10px; font-family: monospace; font-size: 13px;
                    letter-spacing: .05em;
                }
                .toolbar-right { display: flex; gap: 8px; }
                .btn-print {
                    display: flex; align-items: center; gap: 6px;
                    background: #fff; color: #1a1a1a;
                    border: none; border-radius: 8px;
                    padding: 7px 18px; font-size: 13px; font-weight: 600;
                    cursor: pointer; transition: background .15s;
                }
                .btn-print:hover { background: #f0f0f0; }
                .btn-back-link {
                    display: flex; align-items: center; gap: 6px;
                    background: transparent; color: #ccc;
                    border: 1px solid #444; border-radius: 8px;
                    padding: 7px 18px; font-size: 13px; font-weight: 500;
                    cursor: pointer; text-decoration: none;
                    transition: all .15s;
                }
                .btn-back-link:hover { background: #333; color: #fff; }

                /* ── Page wrapper ── */
                .page-wrap {
                    padding: 64px 0 48px;          /* toolbar offset + bottom space */
                    min-height: 100vh;
                    display: flex; flex-direction: column; align-items: center;
                }

                /* ── A4 Paper ── */
                .paper {
                    width: 210mm;
                    min-height: 297mm;
                    background: #fff;
                    box-shadow: 0 4px 40px rgba(0,0,0,.18);
                    padding: 18mm 18mm 14mm;
                    position: relative;
                }

                /* ── Letterhead ── */
                .letterhead {
                    display: flex; align-items: flex-start;
                    justify-content: space-between;
                    padding-bottom: 10px;
                    border-bottom: 3px solid #1a1a1a;
                    margin-bottom: 14px;
                }
                .brand { display: flex; align-items: center; gap: 10px; }
                .brand-icon {
                    width: 40px; height: 40px; border-radius: 8px;
                    background: #1a1a1a;
                    display: flex; align-items: center; justify-content: center;
                }
                .brand-name {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 22px; font-weight: 900; letter-spacing: -.5px;
                    color: #1a1a1a;
                }
                .brand-sub {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 10px; color: #888; margin-top: 1px;
                }
                .doc-meta { text-align: right; }
                .doc-number {
                    font-family: "Courier New", monospace;
                    font-size: 20px; font-weight: 900; letter-spacing: .05em;
                    color: #1a1a1a;
                }
                .doc-title {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 10px; color: #666; margin-top: 2px; text-transform: uppercase;
                    letter-spacing: .08em;
                }
                .doc-date {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 9px; color: #999; margin-top: 2px;
                }

                /* ── Status banner ── */
                .status-bar {
                    border-radius: 8px; padding: 8px 14px;
                    margin-bottom: 14px;
                    display: flex; align-items: center; gap: 10px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .status-bar.approved { background: #f0fdf4; border: 1.5px solid #86efac; }
                .status-bar.rejected { background: #fff1f2; border: 1.5px solid #fca5a5; }
                .status-bar.pending  { background: #fffbeb; border: 1.5px solid #fcd34d; }
                .status-bar.neutral  { background: #f8fafc; border: 1.5px solid #e2e8f0; }
                .status-dot {
                    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
                }
                .approved .status-dot { background: #22c55e; }
                .rejected .status-dot { background: #ef4444; }
                .pending  .status-dot { background: #f59e0b; }
                .neutral  .status-dot { background: #94a3b8; }
                .status-label {
                    font-size: 11px; font-weight: 700; flex: 1;
                }
                .approved .status-label { color: #15803d; }
                .rejected .status-label { color: #b91c1c; }
                .pending  .status-label { color: #92400e; }
                .neutral  .status-label { color: #475569; }
                .status-date { font-size: 10px; color: #888; }

                /* ── LOG banner ── */
                .log-bar {
                    background: #faf5ff; border: 1.5px solid #c4b5fd;
                    border-radius: 8px; padding: 8px 14px;
                    margin-bottom: 14px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .log-bar-header { font-size: 11px; font-weight: 700; color: #6d28d9; margin-bottom: 2px; }
                .log-bar-detail { font-size: 9.5px; color: #7c3aed; display: flex; gap: 12px; flex-wrap: wrap; }

                /* ── Section title ── */
                .section-title {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 8.5px; font-weight: 800;
                    text-transform: uppercase; letter-spacing: .12em;
                    color: #fff; background: #1a1a1a;
                    padding: 3px 10px; border-radius: 4px;
                    display: inline-block; margin-bottom: 6px;
                }

                /* ── Field table ── */
                .field-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
                .field-row td { padding: 3px 0; vertical-align: top; }
                .field-label {
                    font-size: 9.5px; color: #555; width: 38%;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .field-colon { font-size: 9.5px; color: #999; width: 4%; padding: 0 4px; }
                .field-value {
                    font-size: 10.5px; font-weight: 600; color: #1a1a1a;
                    border-bottom: 1px solid #e5e5e5; min-height: 18px;
                    padding-bottom: 1px; width: 58%;
                    font-family: "Times New Roman", Times, serif;
                }
                .field-value.mono { font-family: "Courier New", Courier, monospace; }

                /* ── Two column body ── */
                .body-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 14px; }

                /* ── Coverage period ── */
                .coverage-item {
                    background: #f8fafc; border: 1px solid #e2e8f0;
                    border-radius: 6px; padding: 6px 10px; margin-bottom: 6px;
                }
                .coverage-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 2px;
                }
                .coverage-type {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 9.5px; font-weight: 700; color: #374151;
                }
                .coverage-badge {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 8.5px; font-weight: 600; padding: 1px 7px; border-radius: 10px;
                }
                .badge-ok { background: #dcfce7; color: #15803d; }
                .badge-no { background: #fee2e2; color: #b91c1c; }
                .coverage-dates { font-size: 9px; color: #6b7280; }
                .coverage-amount { font-size: 9.5px; font-weight: 700; color: #1a1a1a; margin-top: 2px; }

                /* ── Signature section ── */
                .sig-section { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
                .sig-box { text-align: center; }
                .sig-line {
                    height: 52px; border: 1px solid #d1d5db; border-radius: 6px;
                    margin-bottom: 4px;
                }
                .sig-label {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 8.5px; color: #6b7280;
                }

                /* ── Footer ── */
                .footer {
                    margin-top: 14px; padding-top: 8px;
                    border-top: 1px solid #e5e5e5;
                    text-align: center;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .footer p { margin: 1px 0; font-size: 8px; color: #9ca3af; }
                .footer .footer-number { font-family: "Courier New", monospace; font-size: 8px; color: #9ca3af; }

                /* ── Page stripe ── */
                .top-stripe {
                    position: absolute; top: 0; left: 0; right: 0; height: 5px;
                    background: linear-gradient(90deg, #1a1a1a 0%, #555 50%, #1a1a1a 100%);
                    border-radius: 0;
                }

                /* ── Watermark (approved only) ── */
                .watermark {
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%) rotate(-35deg);
                    font-size: 80px; font-weight: 900; letter-spacing: .15em;
                    color: rgba(34, 197, 94, 0.09); pointer-events: none;
                    white-space: nowrap; z-index: 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }

                /* ── Spinner ── */
                .spinner {
                    width: 40px; height: 40px; border-radius: 50%;
                    border: 3px solid #e5e5e5; border-top-color: #1a1a1a;
                    animation: spin .8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* ── Print media ── */
                @media print {
                    .toolbar { display: none !important; }
                    .page-wrap { padding: 0; background: #fff; }
                    .paper {
                        box-shadow: none; border-radius: 0;
                        width: 100%; min-height: auto;
                        padding: 14mm 14mm 12mm;
                    }
                    body { background: #fff; }
                }
            `}</style>

            {/* ── TOOLBAR ── */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <Link href={`/agent/claims/${params.id}`} className="toolbar-back">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 5l-7 7 7 7" />
                        </svg>
                        Kembali ke Klaim
                    </Link>
                    <span className="claim-badge">{c.claim_number}</span>
                </div>
                <div className="toolbar-right">
                    <button className="btn-print" onClick={() => window.print()}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" rx="1" />
                        </svg>
                        Cetak / Simpan PDF
                    </button>
                </div>
            </div>

            {/* ── PAGE ── */}
            <div className="page-wrap">
                <div className="paper">
                    {/* Top decorative stripe */}
                    <div className="top-stripe" />

                    {/* Approved watermark */}
                    {isApproved && <div className="watermark">DISETUJUI</div>}
                    {isRejected && (
                        <div className="watermark" style={{ color: "rgba(239,68,68,0.08)" }}>DITOLAK</div>
                    )}

                    {/* ── LETTERHEAD ── */}
                    <div className="letterhead" style={{ marginTop: 12 }}>
                        <div className="brand">
                            <div className="brand-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div>
                                <div className="brand-name">AsistenQu</div>
                                <div className="brand-sub">Platform Manajemen Asuransi Digital</div>
                            </div>
                        </div>
                        <div className="doc-meta">
                            <div className="doc-number">{c.claim_number}</div>
                            <div className="doc-title">Formulir Pengajuan Klaim</div>
                            <div className="doc-date">Dibuat: {fmt(c.created_at)}</div>
                        </div>
                    </div>

                    {/* ── LOG BANNER ── */}
                    {hasLog && (
                        <div className="log-bar">
                            <div className="log-bar-header">
                                🔐 Letter of Guarantee (LOG) · {c.log_number}
                            </div>
                            <div className="log-bar-detail">
                                {c.insurance_name && <span>Asuransi: <strong>{c.insurance_name}</strong></span>}
                                {c.log_issued_at && <span>Diterbitkan: <strong>{fmt(c.log_issued_at)}</strong></span>}
                                {c.log_sent_to_hospital_at && <span>Dikirim RS: <strong>{fmt(c.log_sent_to_hospital_at)}</strong></span>}
                                {c.insurance_contact && <span>Kontak: <strong>{c.insurance_contact}</strong></span>}
                            </div>
                        </div>
                    )}

                    {/* ── STATUS BANNER ── */}
                    <div className={`status-bar ${isApproved ? "approved" : isRejected ? "rejected" : c.status === "SUBMITTED" ? "pending" : "neutral"}`}>
                        <div className="status-dot" />
                        <div className="status-label">
                            Status: {stageLabel(c.stage || c.status)}
                        </div>
                        <div className="status-date">Tanggal Klaim: {fmt(c.claim_date)}</div>
                    </div>

                    {/* ── BODY: 2 columns ── */}
                    <div className="body-grid">
                        {/* LEFT */}
                        <div>
                            <div className="section-title">Data Nasabah / Pasien</div>
                            <table className="field-table">
                                <tbody>
                                    <Field label="Nama Lengkap" value={c.client_name} />
                                    <Field label="NIK" value={c.nik} mono />
                                    <Field label="Tanggal Lahir" value={fmt(c.birth_date)} />
                                    <Field label="Jenis Kelamin" value={c.gender === "M" ? "Laki-laki" : c.gender === "F" ? "Perempuan" : c.gender} />
                                    <Field label="No. Telepon" value={c.phone_number} mono />
                                    <Field label="Alamat" value={c.address} />
                                </tbody>
                            </table>

                            <div className="section-title">Data Polis / Kontrak</div>
                            <table className="field-table">
                                <tbody>
                                    <Field label="No. Polis" value={c.contract_number} mono />
                                    <Field label="Produk Asuransi" value={c.product_name} />
                                    <Field label="Berlaku Mulai" value={fmt(c.policy_start)} />
                                    <Field label="Berlaku Hingga" value={fmt(c.policy_end)} />
                                    <Field label="Premi" value={fmtCurrency(c.premium_amount)} />
                                </tbody>
                            </table>
                        </div>

                        {/* RIGHT */}
                        <div>
                            <div className="section-title">Data Medis</div>
                            <table className="field-table">
                                <tbody>
                                    <Field label="Rumah Sakit" value={c.hospital_name} />
                                    <Field label="Alamat RS" value={c.hospital_address} />
                                    <Field label="Diagnosa Penyakit" value={c.disease_name} />
                                    <Field label="Kode ICD-10" value={c.icd10_code} mono />
                                </tbody>
                            </table>

                            <div className="section-title">Klaim</div>
                            <table className="field-table">
                                <tbody>
                                    <Field label="Total Estimasi Biaya" value={fmtCurrency(c.total_amount)} />
                                    {c.plain_notes && <Field label="Catatan" value={c.plain_notes} />}
                                </tbody>
                            </table>

                            {/* Coverage Periods */}
                            {c.coverage_periods && c.coverage_periods.length > 0 && (
                                <>
                                    <div className="section-title">Periode Rawat Inap</div>
                                    {c.coverage_periods.map((cp, i) => (
                                        <div key={i} className="coverage-item">
                                            <div className="coverage-header">
                                                <span className="coverage-type">
                                                    {cp.type === "BEFORE" ? "Sebelum Rawat Inap" : "Sesudah Rawat Inap"}
                                                </span>
                                                <span className={`coverage-badge ${cp.is_eligible ? "badge-ok" : "badge-no"}`}>
                                                    {cp.is_eligible ? "Eligible" : "> 30 Hari"}
                                                </span>
                                            </div>
                                            <div className="coverage-dates">{fmt(cp.start_date)} — {fmt(cp.end_date)}</div>
                                            {cp.amount && <div className="coverage-amount">{fmtCurrency(cp.amount)}</div>}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── AGENT ── */}
                    <div className="section-title">Data Agen</div>
                    <table className="field-table" style={{ marginBottom: 14 }}>
                        <tbody>
                            <tr className="field-row">
                                <td className="field-label">Nama Agen</td>
                                <td className="field-colon">:</td>
                                <td className="field-value">{c.agent_name || "—"}</td>
                                <td style={{ width: 20 }} />
                                <td className="field-label">Email Agen</td>
                                <td className="field-colon">:</td>
                                <td className="field-value mono">{c.agent_email || "—"}</td>
                                <td style={{ width: 20 }} />
                                <td className="field-label">Kode Referral</td>
                                <td className="field-colon">:</td>
                                <td className="field-value mono">{c.agent_referral_code || "—"}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ── SIGNATURES ── */}
                    <div className="sig-section">
                        {["Tanda Tangan Nasabah", "Tanda Tangan Agen", "Tanda Tangan & Stempel RS"].map(label => (
                            <div key={label} className="sig-box">
                                <div className="sig-line" />
                                <div className="sig-label">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── FOOTER ── */}
                    <div className="footer">
                        <p>Dokumen ini digenerate otomatis oleh sistem AsistenQu · Dicetak: {now}</p>
                        <p className="footer-number">{c.claim_number}</p>
                    </div>
                </div>
            </div>
        </>
    );
}
