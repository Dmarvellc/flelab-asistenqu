# Flow Documentation — Hospital, Agent, Developer

> Last updated: 2026-04-03

---

## DAFTAR ISI
1. [Auth System (Shared)](#1-auth-system-shared)
2. [Developer Flow](#2-developer-flow)
3. [Hospital Flow](#3-hospital-flow)
4. [Agent Flow](#4-agent-flow)
5. [Admin Agency Flow](#5-admin-agency-flow)
6. [BUGS & ISSUES](#6-bugs--issues)

---

## 1. Auth System (Shared)

### Login — `POST /api/auth/login`
```
Request: { email, password, rememberMe?, portal: "agent"|"hospital"|"developer"|"admin_agency" }
```
1. Verifikasi password via `verifyPassword()` → query `app_user`
2. Cek role sesuai portal (`PORTAL_ALLOWED_ROLES`)
3. Hapus semua session cookies lama (`clearAuthCookies`)
4. Set cookie baru sesuai prefix role:

| Role              | Cookie Prefix           |
|-------------------|-------------------------|
| agent/agent_manager | `session_agent_*`     |
| hospital_admin    | `session_hospital_*`    |
| developer         | `session_developer_*`   |
| admin_agency/insurance_admin | `session_admin_agency_*` |
| super_admin       | `session_super_admin_*` |

Cookie yang di-set: `{prefix}_role`, `{prefix}_user_id`, `{prefix}_status`

### Logout — `POST /api/auth/logout` atau `GET /api/auth/logout`
- Clear cookies berdasarkan query param `from` (agent/hospital/developer/admin_agency)
- Jika tanpa param, clear semua session cookies

### Middleware (`src/middleware.ts`)
- Runs di semua path non-API
- Urutan cek cookie (context-aware):
  1. super_admin (global, override semua)
  2. agent/agent_manager (jika path butuh agent)
  3. hospital_admin (jika path butuh hospital)
  4. developer (jika path butuh developer)
  5. admin_agency/insurance_admin (jika path butuh admin_agency)
- Jika belum login → redirect ke `/{module}/login`
- Jika agent PENDING → hanya boleh akses `/agent/verification` dan `/agent/settings`

### RBAC (`src/lib/rbac.ts`)
| Path Prefix           | Roles yang Diizinkan                              |
|-----------------------|--------------------------------------------------|
| `/admin-agency-insurance` | super_admin, admin_agency, insurance_admin   |
| `/hospital`           | super_admin, hospital_admin                       |
| `/agent`              | super_admin, agent_manager, agent                 |
| `/agent-portal`       | super_admin, agent                                |
| `/developer`          | super_admin, developer                            |

### `auth-cookies.ts` — Shared Helpers
- `getRoleFromCookies()` → iterasi semua role cookies, return yang pertama ditemukan
- `getUserIdFromCookies()` → iterasi semua user_id cookies, return yang pertama ditemukan
- **Catatan:** Fungsi ini tidak context-specific, hanya aman karena `clearAuthCookies` saat login

---

## 2. Developer Flow

### Login
`/developer/login` → `POST /api/auth/login` (portal: "developer")
- Role yang boleh: developer, super_admin
- Cookie: `session_developer_role`, `session_developer_user_id`

### Halaman
| Path | Deskripsi |
|------|-----------|
| `/developer` | Dashboard — list semua klaim di sistem (`getAllClaims()`) |
| `/developer/users` | Manajemen user — list, edit role/status, delete, tambah user |
| `/developer/pending` | List user PENDING menunggu approval |
| `/developer/add-hospital` | Form buat akun hospital_admin baru |
| `/developer/add-agency` | Form buat akun admin_agency baru |

### API Routes
| Method | Route | Fungsi | Auth Check |
|--------|-------|--------|------------|
| POST | `/api/auth/login` | Login developer | — |
| POST | `/api/developer/create` | Buat user baru (hospital_admin, admin_agency, agent) | developer/super_admin cookie |
| GET | `/api/developer/pending` | List user PENDING | developer/super_admin cookie |
| POST | `/api/developer/approve` | Approve user PENDING → ACTIVE | developer/super_admin cookie |
| POST | `/api/developer/reject` | Reject user PENDING | developer/super_admin cookie |
| GET | `/api/developer/stats` | Statistik sistem | developer/super_admin cookie |
| GET | `/api/users` | List semua user (pagination, search, sort) | developer cookie |
| GET | `/api/users/[id]` | Detail user | developer cookie |
| PATCH | `/api/users/[id]` | Update role/status user | developer cookie |
| DELETE | `/api/users/[id]` | Hapus user | developer cookie |

### Create User Flow (`/api/developer/create`)
```
POST body: { email, password, role, fullName, nik, phoneNumber, address, birthDate, gender }

Validasi:
  - role harus valid (dari roles[])
  - role harus: hospital_admin | insurance_admin | admin_agency | agent

Proses:
  1. getUserIdFromCookies() → approvedBy
  2. createActiveUser({ email, password, role, approvedBy, profile })
     - INSERT app_user (status: ACTIVE)
     - INSERT person
     - INSERT user_person_link
     - Jika role=agent: INSERT agent record juga
```

---

## 3. Hospital Flow

### Login
`/hospital/login` → `POST /api/auth/login` (portal: "hospital")
- Role yang boleh: hospital_admin, super_admin
- Cookie: `session_hospital_role`, `session_hospital_user_id`, `session_hospital_status`

### Halaman
| Path | Deskripsi |
|------|-----------|
| `/hospital` | Dashboard — pending & active claims, summary |
| `/hospital/claims` | List semua klaim milik rumah sakit |
| `/hospital/claims/[id]` | Detail klaim — review, approve/reject |
| `/hospital/appointments` | List jadwal appointment |
| `/hospital/patients` | Cari pasien, buat permintaan data pasien |

### API Routes
| Method | Route | Fungsi | Auth Check |
|--------|-------|--------|------------|
| POST | `/api/auth/login` | Login hospital | — |
| GET | `/api/hospital/claims` | List klaim hospital (Redis 30s) | `session_hospital_user_id` |
| GET | `/api/hospital/claims/[id]` | Detail klaim (Redis 30s) | `session_hospital_user_id` |
| PATCH | `/api/hospital/claims/[id]` | Approve / Reject klaim | `session_hospital_user_id` |
| POST | `/api/hospital/claims/[id]/request-info` | Minta info tambahan ke agen | `session_hospital_user_id` |
| GET | `/api/hospital/appointments` | List appointment | `session_hospital_user_id` |
| PATCH | `/api/hospital/appointments/[id]` | Update appointment | `session_hospital_user_id` |
| GET | `/api/hospital/patients/search` | Cari pasien by nama/NIK | `session_hospital_user_id` |
| GET | `/api/hospital/patients/request` | List permintaan data pasien | `session_hospital_user_id` |
| POST | `/api/hospital/patients/request` | Buat permintaan data pasien ke agen | `session_hospital_user_id` |
| DELETE | `/api/hospital/patients/request/[id]` | Hapus permintaan | `session_hospital_user_id` |

### Claim Approval Flow
```
PATCH /api/hospital/claims/[id]
body: { status: "APPROVED" | "REJECTED", notes? }

Validasi sebelum APPROVED:
  - Minimal 1 dokumen di claim
  - Tidak ada claim_info_request yang masih PENDING

Proses:
  1. UPDATE claim SET status = ...
  2. INSERT claim_timeline (action, notes, created_by)
  3. Invalidate Redis cache: claims:hospital:detail:{id}, claims:hospital:list:*
```

### Patient Data Request Flow
```
POST /api/hospital/patients/request
body: { person_id, additional_data_request? }

Proses:
  1. Cari agent_id dari tabel client WHERE person_id = ?
  2. INSERT patient_data_request (hospital_id, agent_id, person_id, ...)
  → Notifikasi ke agen (belum ada mekanisme push)
```

---

## 4. Agent Flow

### Login
`/agent/login` → `POST /api/auth/login` (portal: "agent")
- Role yang boleh: agent, agent_manager, super_admin
- Cookie: `session_agent_role`, `session_agent_user_id`, `session_agent_status`

### Register (Self-signup)
`/agent/register` → `POST /api/auth/register`
- Buat user dengan status PENDING
- Setelah register → redirect ke `/agent/verification`

### Verification Flow (PENDING agent)
```
Middleware cek:
  - session_agent_status === 'PENDING'
  → Paksa redirect ke /agent/verification
  → Hanya boleh: /agent/verification dan /agent/settings

/agent/verification:
  - Upload KTP (base64) dan selfie
  - PUT /api/agent/profile → updateUserProfile()
  → Developer approve di /developer/pending
  → Status jadi ACTIVE → cookie di-refresh
```

### Halaman
| Path | Deskripsi |
|------|-----------|
| `/agent` | Dashboard — metrics, chart 6 bulan, list klaim |
| `/agent/register` | Registrasi agen baru |
| `/agent/verification` | Upload KTP & selfie (PENDING only) |
| `/agent/clients` | List nasabah agen |
| `/agent/clients/new` | Tambah nasabah baru |
| `/agent/clients/[id]` | Detail nasabah |
| `/agent/claims` | List klaim agen |
| `/agent/claims/new` | Buat klaim baru |
| `/agent/claims/[id]` | Detail klaim |
| `/agent/claims/[id]/print` | Print klaim |
| `/agent/appointments` | List appointment nasabah |
| `/agent/requests` | List permintaan data dari rumah sakit |
| `/agent/referral` | Program referral |
| `/agent/doctors` | List dokter tersedia |
| `/agent/settings` | Update profil |

### API Routes
| Method | Route | Fungsi | Auth Check |
|--------|-------|--------|------------|
| POST | `/api/auth/login` | Login agent | — |
| POST | `/api/auth/register` | Register agen baru | — |
| GET | `/api/agent/clients` | List nasabah | `session_agent_user_id` |
| POST | `/api/agent/clients/create` | Buat nasabah baru | `session_agent_user_id` |
| GET/PATCH | `/api/agent/clients/[id]` | Detail/update nasabah | `session_agent_user_id` |
| GET | `/api/agent/claims` | List klaim (Redis 30s) | `session_agent_user_id` |
| POST | `/api/agent/claims` | Buat klaim baru (DRAFT) | `session_agent_user_id` |
| GET | `/api/agent/claims/[id]` | Detail klaim (Redis 30s) | `session_agent_user_id` |
| PATCH | `/api/agent/claims/[id]` | Update klaim (DRAFT only) / submit | `session_agent_user_id` |
| DELETE | `/api/agent/claims/[id]` | Hapus klaim (DRAFT only) | `session_agent_user_id` |
| POST | `/api/agent/claims/[id]/log` | Log operasi klaim | `session_agent_user_id` |
| GET/POST | `/api/agent/claims/[id]/documents` | Dokumen klaim | `session_agent_user_id` |
| POST | `/api/agent/claims/[id]/upload` | Upload file | `session_agent_user_id` |
| POST | `/api/agent/claims/[id]/info-request` | Minta info ke RS | `session_agent_user_id` |
| GET | `/api/agent/claims/[id]/coverage` | Cek coverage | `session_agent_user_id` |
| GET | `/api/agent/claims/[id]/pdf-data` | Ekstrak data PDF | `session_agent_user_id` |
| GET | `/api/agent/appointments` | List appointment | `session_agent_user_id` |
| PATCH | `/api/agent/appointments/[id]` | Update appointment | `session_agent_user_id` |
| GET/POST | `/api/agent/requests` | Permintaan dari RS | `session_agent_user_id` |
| GET/PATCH | `/api/agent/requests/[id]` | Detail/update request | `session_agent_user_id` |
| POST | `/api/agent/requests/[id]/upload` | Upload untuk request | `session_agent_user_id` |
| GET | `/api/agent/profile` | Ambil profil | `session_agent_user_id` |
| PUT | `/api/agent/profile` | Update profil | `session_agent_user_id` |
| GET | `/api/agent/metrics` | Data dashboard | `session_agent_user_id` |
| GET | `/api/agent/referral` | Data referral | `session_agent_user_id` |
| POST | `/api/agent/parse-policy` | Parse polis asuransi | `session_agent_user_id` |
| POST | `/api/agent/transfer-request` | Transfer nasabah/klaim | `session_agent_user_id` |
| POST | `/api/agent/logout` | Logout | — |

### Claim Lifecycle (Agent)
```
DRAFT → (submit) → SUBMITTED → (hospital review) → APPROVED / REJECTED

Buat klaim (POST /api/agent/claims):
  - Wajib: client_id, hospital_id, disease_id, claim_date, total_amount
  - Cek kontrak aktif → link ke contract_id jika ada
  - INSERT claim (status: DRAFT)
  - INSERT claim_timeline

Submit klaim (PATCH /api/agent/claims/[id]):
  - body: { status: "SUBMITTED" }
  - Validasi: minimal 1 dokumen
  - UPDATE claim SET status = 'SUBMITTED'
  - INSERT claim_timeline
  - Invalidate cache: claims:agent:list:{userId}, claims:agent:detail:{id}:*

Hapus klaim (DELETE /api/agent/claims/[id]):
  - Hanya DRAFT
  - Cascade delete: claim_timeline, claim_document, claim_item
```

---

## 5. Admin Agency Flow

### Login
`/admin-agency/login` → `POST /api/auth/login` (portal: "admin_agency")
- Role yang boleh: admin_agency, insurance_admin, super_admin
- Cookie: `session_admin_agency_role`, `session_admin_agency_user_id`

### Halaman
| Path | Deskripsi |
|------|-----------|
| `/admin-agency` | Dashboard agency |
| `/admin-agency/agents` | Kelola agen di bawah agency |
| `/admin-agency/clients` | List nasabah |
| `/admin-agency/claims` | List klaim |
| `/admin-agency/claims/[id]` | Detail klaim |
| `/admin-agency/transfers` | Transfer agen/nasabah |
| `/admin-agency/performance` | Laporan performa |
| `/admin-agency/settings` | Pengaturan agency |

---

## 6. BUGS & ISSUES

### ✅ SUDAH DIPERBAIKI

#### B1. `hospital_id` diisi dengan `user_id` di Patient Request ✅
**File:** `src/app/api/hospital/patients/request/route.ts` & `[id]/route.ts`
**Fix:** Semua 3 handler (GET, POST, DELETE) sekarang memanggil `getHospitalIdByUserId(userId)` untuk resolve hospital_id yang benar sebelum query.

#### B2. RBAC Path Mismatch — Admin Agency Tidak Terproteksi ✅
**File:** `src/lib/rbac.ts`
**Fix:** Prefix diubah dari `/admin-agency-insurance` → `/admin-agency`. Semua halaman admin agency kini terproteksi middleware.

#### P1. Context-Specific Cookie Helpers ✅
**File:** `src/lib/auth-cookies.ts`
**Fix:** Ditambah helper: `getHospitalUserIdFromCookies()`, `getAgentUserIdFromCookies()`, `getAdminAgencyUserIdFromCookies()`, `getDeveloperUserIdFromCookies()`.

#### P2. Developer Tidak Buat Record Hospital/Agency Entity ✅
**File:** `src/lib/auth-queries.ts` — `createActiveUser()`
**Fix:**
- Jika `role === 'hospital_admin'`: INSERT ke `public.hospital`, lalu INSERT ke `public.user_role` (scope_type='HOSPITAL', scope_id=hospital_id)
- Jika `role === 'admin_agency'`: INSERT ke `public.agency`, lalu UPDATE `app_user.agency_id`

#### P3. Validasi Klaim — Client Ownership + Hospital Exists ✅
**File:** `src/app/api/agent/claims/route.ts` (POST)
**Fix:** Ditambah 2 validasi sebelum INSERT klaim:
1. Cek `client.agent_id === userId` — pastikan client milik agent yang login
2. Cek hospital_id ada di tabel `public.hospital`

#### Developer Create — Redundant Role Check ✅
**File:** `src/app/api/developer/create/route.ts`
**Fix:** Logika nested if-if-if yang redundant diganti dengan satu kondisi: `if (!creatableRoles.has(body.role))`.

---

### 🔵 CATATAN (Belum Diubah)

#### C1. Agent ID = User ID (By Design)
- `agent.agent_id` sengaja disamakan dengan `user_id` saat registrasi
- Ini adalah design choice yang ada di komentar kode
- Tetap fragile jika ada jalur pembuatan agent lain

#### C2. Cache Invalidation Tidak Terpusat
- Pola cache key tersebar di banyak file
- Fungsional tapi sulit di-maintain jika key pattern berubah

#### C3. Tidak Ada Notifikasi Real-time
- `patient_data_request` tidak trigger notifikasi ke agen
- Approve/reject klaim tidak trigger notifikasi ke agen

#### C4. Logout Tanpa Parameter
- `POST /api/auth/logout` tanpa `from` param → clear semua session
- Low risk karena portal terpisah, tapi perlu diperhatikan

---

## RINGKASAN KONEKSI ANTAR FLOW

```
Developer
  └─► Buat akun → hospital_admin, admin_agency, agent
  └─► Approve/reject agen PENDING

Agent
  └─► Register (PENDING) → verified by Developer
  └─► Buat klaim → Kirim ke Hospital
  └─► Terima patient_data_request dari Hospital → Jawab via /agent/requests
  └─► Lihat appointment nasabah

Hospital
  └─► Terima klaim dari Agent → Approve/Reject
  └─► Buat patient_data_request ke Agent
  └─► Kelola appointment

Admin Agency
  └─► Kelola agen di bawah agency
  └─► Monitor klaim & performa
  └─► Transfer agen/nasabah
```
