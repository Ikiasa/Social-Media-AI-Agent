# Operational Runbooks: Riona Social Media AI Agent (Phase 7 — Staging & Production)

Documenting 11 operational runbooks for staging and production incident management.

---

## Runbook 1: OAuth Callback Failure
- **Indikator**: Pengguna mendapatkan error `INVALID_OAUTH_STATE`, `ENVIRONMENT_MISMATCH`, atau timeout saat menghubungkan akun sosial.
- **Dampak**: Koneksi provider tidak terbentuk; capability probe gagal berjalan.
- **Langkah Diagnosis**:
  1. Periksa log API dengan filter `operation: "oauth_callback"`.
  2. Verifikasi apakah `expiresAt` (5 menit) terlewati atau nonce sudah terpakai (`REUSED_OAUTH_STATE`).
  3. Cek apakah domain callback OAuth di Meta Developer Portal cocok dengan `OAUTH_CALLBACK_URL` staging/production.
- **Tindakan Aman**: Minta pengguna memuat ulang halaman dan memulai ulang alur OAuth dari UI.
- **Rollback**: Tidak ada perubah data pada database jika state gagal.
- **Escalation Path**: Jika kegagalan berlanjut, hubungi Platform Security Lead untuk memeriksa HMAC JWT Secret.

---

## Runbook 2: Token Expired atau Revoked
- **Indikator**: Health check mengembalikan `status: "DEGRADED"` atau error HTTP 401 dari Facebook Graph API.
- **Dampak**: Ingesti data otomatis dan sync metrik terhenti untuk akun terdampak.
- **Langkah Diagnosis**:
  1. Periksa `lastErrorCode` pada `ProviderConnection`.
  2. Jalankan `socialListeningGatewayService.checkHealth(connectionId, context)`.
  3. Verifikasi apakah pengguna mencabut izin (user revoked permission) dari Instagram App Settings.
- **Tindakan Aman**: Set status `ProviderConnection` ke `PENDING_REAUTH` dan kirimkan notifikasi ke admin tenant.
- **Rollback**: Minta pengguna melakukan re-connect OAuth.
- **Escalation Path**: Support Engineer Team -> Integration Lead.

---

## Runbook 3: Webhook Signature Invalid
- **Indikator**: Spike alert `WEBHOOK_SIGNATURE_SPIKE` (>5 failure/menit) pada `AlertManagerService`.
- **Dampak**: Payload webhook ditolak oleh gateway dengan HTTP 401 `INVALID_SIGNATURE`.
- **Langkah Diagnosis**:
  1. Periksa header `x-hub-signature-256` atau `x-provider-signature` pada log gateway.
  2. Cek apakah selisih timestamp `x-provider-timestamp` melebihi window 5 menit (replay attack attempt).
  3. Verifikasi apakah `WEBHOOK_SECRET` pada environment gateway cocok dengan App Secret di Developer Dashboard.
- **Tindakan Aman**: Jika secret terindikasi desinkronisasi, perbarui `WEBHOOK_SECRET` di Secret Manager.
- **Rollback**: Kembalikan nilai secret sebelumnya jika salah update.
- **Escalation Path**: Cloud Security Engineer.

---

## Runbook 4: Circuit Breaker OPEN
- **Indikator**: Connection status berubah menjadi `ERROR` dan `getCircuitBreakerState(connectionId)` mengembalikan `OPEN`.
- **Dampak**: Request ke provider di-fast-fail tanpa membebankan API downstream.
- **Langkah Diagnosis**:
  1. Cek `lastErrorCode` pada `ProviderConnection`.
  2. Verifikasi apakah provider sedang mengalami service outage atau rate limit.
- **Tindakan Aman**: Biarkan circuit breaker pada mode auto-reset (5 detik `resetTimeoutMs`). Jalankan `checkHealth` secara manual setelah 1 menit.
- **Rollback**: Panggil `circuitBreaker.reset()` jika isu downstream sudah teratasi.
- **Escalation Path**: Site Reliability Engineer (SRE).

---

## Runbook 5: Sync Duplicate Record
- **Indikator**: Log gateway mencatat log `status: "DUPLICATE"` pada pemrosesan webhook atau manual sync.
- **Dampak**: Data tidak diduplikasi di database; event downstream tidak dipicu ulang.
- **Langkah Diagnosis**:
  1. Verifikasi `sourceRecordId` dan `payloadHash` di `SocialDataIngestionRecordModel`.
  2. Pastikan Compound Unique Index `{ workspaceId: 1, source: 1, sourceRecordId: 1 }` bekerja sesuai spesifikasi.
- **Tindakan Aman**: Tidak ada tindakan yang diperlukan; sistem bekerja idempotently secara normal.
- **Rollback**: N/A.
- **Escalation Path**: Data Platform Lead (jika ada false positive duplicate).

---

## Runbook 6: Rate-Limit Response (HTTP 429)
- **Indikator**: Provider API mengembalikan HTTP 429 atau rate limit error header (`x-app-usage`).
- **Dampak**: Request sync ditunda; circuit breaker dapat bertransisi ke `OPEN`.
- **Langkah Diagnosis**:
  1. Cek kuota API call per jam di dashboard provider.
  2. Periksa apakah frekuensi sync cron terlalu tinggi untuk tenant tersebut.
- **Tindakan Aman**: Terapkan exponential backoff dan turunkan frekuensi polling cron.
- **Rollback**: Kurangi jumlah akun aktif yang disinkronkan secara simultan.
- **Escalation Path**: Integration Engineer.

---

## Runbook 7: Worker Queue Backlog
- **Indikator**: Alert `WORKER_QUEUE_BACKLOG` aktif (>100 job tertunda di Redis/BullMQ).
- **Dampak**: Pemrosesan media derivative dan pengiriman pesan mengalami delay.
- **Langkah Diagnosis**:
  1. Cek kedalaman queue di BullMQ Dashboard.
  2. Periksa konsumsi CPU/Memory pada worker pods.
- **Tindakan Aman**: Scale up worker instances (autoscale HPA dari 2 ke 5 pods).
- **Rollback**: Scale down worker pods setelah backlog bersih.
- **Escalation Path**: Infrastructure / DevOps Team.

---

## Runbook 8: Data Mismatch / Quality Drop
- **Indikator**: `dataQuality.coverage` bernilai `limited` atau field metrik bernilai null.
- **Dampak**: Laporan analitik menampilkan data parsial.
- **Langkah Diagnosis**:
  1. Periksa `dataQuality.unavailableFields` pada `SocialDataIngestionRecordModel`.
  2. Cek apakah OAuth permission yang diberikan pengguna terbatas.
- **Tindakan Aman**: Minta pengguna memperbarui izin scope OAuth (re-auth dengan scope lengkap).
- **Rollback**: N/A.
- **Escalation Path**: Data Engineering Team.

---

## Runbook 9: Incident Security / Credential Exposure
- **Indikator**: Log/API response terindikasi memuat raw secret/token, atau HMAC key mengalami kompromi.
- **Dampak**: Potensi akses tanpa hak ke API provider atau data tenant.
- **Langkah Diagnosis**:
  1. Identifikasi sumber kebocoran melalui `Logger` audit trail.
  2. Periksa commit history dan build artifacts.
- **Tindakan Aman**:
  1. Segera putar (rotate) secret terkait (`WEBHOOK_SECRET`, `HMAC_APPROVAL_SECRET`, `JWT_SECRET`).
  2. Revoke OAuth access token yang terpengaruh melalui Meta App Admin.
- **Rollback**: Deploy hotfix sanitasi log.
- **Escalation Path**: Chief Information Security Officer (CISO) & Staff Security Engineer.

---

## Runbook 10: Rollback Feature Flag
- **Indikator**: Terjadi isu kritis pada pilot Instagram Official API di tenant staging/production.
- **Dampak**: Pilot harus dihentikan secara instan tanpa mengganggu tenant lain.
- **Langkah Diagnosis**:
  1. Identifikasi `workspaceId` tenant yang terdampak.
- **Tindakan Aman**:
  Jalankan perintah rollback pada `TenantFeatureFlagService`:
  `tenantFeatureFlags.rollbackPilot(workspaceId)`
- **Rollback**: Menyetel `instagramOfficialPilot`, `instagramMetricsSync`, `instagramInboxWebhook`, `instagramPublishing`, dan `instagramCommunityReply` ke `false`.
- **Escalation Path**: Product Manager & Engineering Lead.

---

## Runbook 11: Restore Backup Database (Staging/Production Procedure)
- **Indikator**: Terjadi korupsi data atau kegagalan migrasi database.
- **Dampak**: Data operasional tidak konsisten.
- **Langkah Diagnosis**:
  1. Verifikasi snapshot backup terbaru di Object Storage/S3 bucket.
- **Tindakan Aman (Prosedur Verification Staging)**:
  1. Hentikan traffik API sementara (maintenance mode).
  2. Download snapshot backup terenkripsi.
  3. Restorasi ke instance MongoDB staging terisolasi.
  4. Jalankan integritas tes: verify document counts & indexes.
  5. Route kembali traffic API ke instance yang dipulihkan.
- **Rollback**: Kembalikan DNS/connection string ke secondary standby database jika restore gagal.
- **Escalation Path**: Principal Database Administrator (DBA).
