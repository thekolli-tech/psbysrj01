# Property Studio — Phase 4B: Production Redis Activation Verification Report

**Date & Time:** 2026-11-19T06:55:00Z / 12:25:00 IST
**Target Environment:** Production (`https://psbysrj01.vercel.app`)
**Repository:** `thekolli-tech/psbysrj01`
**Evaluation Nature:** Read-Only Adversarial & Telemetry Verification

---

## 1. Executive Summary & Verification Matrix

| Verification Check | Target Component | Status | Evidence / Finding Summary |
| :--- | :--- | :--- | :--- |
| **Deployment Identity** | `/api/health` | **PASS** | Deployed commit is `6cff7e4f7bb20fd92db525de51ac51f03c2d9286` on `main` branch. PostgreSQL is authoritative (`sqliteFallback: false`, `schemaReady: true`). |
| **Vercel Function Region** | `x-vercel-id` | **PASS** | Function compute executes in `iad1` (Washington, D.C., USA). Edge PoP is `bom1` (Mumbai, India). |
| **Environment Presence** | Production Environment | **NOT VERIFIED** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_KEY_SECRET` are not exposed in public health/telemetry endpoints (by design). Values/lengths are not disclosed. |
| **Rate-Limit Engine (Live)** | `/api/auth/login`, `/api/auth/register` | **FAIL** | Response header returns `X-RateLimit-Engine: memory_fallback`. Serverless runtime is currently executing local memory rate-limiting rather than Redis. |
| **Rate-Limit Code Routing** | `server.ts:446-466` | **FAIL** | `rejectIfRateLimited` in `server.ts` synchronously delegates to `allowMemoryRequest(key, limit, windowMs)`. Async `rejectIfRateLimitedAsync` and `checkRateLimit` are not invoked by application routes. |
| **Rate-Limit Atomicity & Expiry** | `src/server/rateLimit.ts` | **PASS** (Code) / **NOT VERIFIED** (Live) | Pipeline `INCR`, `PEXPIRE <key> <windowMs> NX`, and `PTTL` is atomic in code; inactive in live routing due to memory store delegation. |
| **HMAC Pseudonymization** | `src/server/rateLimit.ts` | **PASS** | Canonical prefix tagging (`phone:`, `email:`, `raw:`), 32-hex HMAC-SHA-256 identity hashing, and 16-hex IP pseudonymization. Zero plaintext PII in Redis key structure. |
| **Webhook Deduplication** | `src/server/webhookSecurity.ts` | **PASS** (Code) / **NOT VERIFIED** (Live) | Atomic `SET <key> 1 EX 86400 NX` implemented; live execution is properly gated behind webhook secret authentication (`HTTP 401`). |
| **Security Regressions** | Upload, Headers, RBAC | **PASS** | Direct upload rejected (`401`), admin header spoofing rejected (`404`), diagnostics sanitized (`200 healthy`), strict security headers verified (`HSTS`, `CSP`, `nosniff`, `DENY`). |

---

## 2. Production Deployment Confirmation

A live non-destructive inspection of `GET https://psbysrj01.vercel.app/api/health` yielded:

```json
{
  "status": "OK",
  "authoritativeDatabase": "postgresql",
  "sqliteFallback": false,
  "database": {
    "connected": true,
    "schemaReady": true,
    "missingTables": [],
    "latencyMs": 1796,
    "code": null,
    "failure": null,
    "target": {
      "host": "pooled.db.prisma.io",
      "port": 5432,
      "database": "postgres",
      "dns": "RESOLVED"
    }
  },
  "deployment": {
    "commit": "6cff7e4f7bb20fd92db525de51ac51f03c2d9286",
    "ref": "main",
    "target": "production"
  }
}
```

### Deployment Attributes
1. **Commit SHA:** `6cff7e4f7bb20fd92db525de51ac51f03c2d9286` (Matches intended Phase 4A release).
2. **Authoritative Storage:** PostgreSQL via pooled connection; SQLite fallback is disabled (`sqliteFallback: false`).
3. **Database Health:** Connected with ready schema (`missingTables: []`).

---

## 3. Vercel Function Region & Geographic Latency Analysis

Inspection of response headers across production endpoints:
```http
Server: Vercel
X-Vercel-Cache: MISS
X-Vercel-Id: bom1::iad1::wb8xk-1795071258446-2e2393d7f40a
```

### Vercel Routing Topology
- **Edge Routing PoP:** `bom1` (Mumbai, India) — incoming user connections terminate at Mumbai edge.
- **Serverless Compute Region:** `iad1` (Washington, D.C., USA / US East) — serverless functions execute in northern Virginia.
- **Root Configuration:** `vercel.json` does not declare a `regions` key, which defaults function deployments to `iad1`.

> [!WARNING]
> **Cross-Region Latency Implications:**
> The Upstash Redis database `property-studio-redis` is hosted in AWS Mumbai (`ap-south-1`). Because Vercel serverless functions are executing in `iad1` (US East), each Redis REST API call incurs a transatlantic round-trip (~160ms–220ms).
> Once Redis rate-limiting is activated in `server.ts`, this latency will be added to rate-limited request paths unless Vercel functions are configured for `bom1` in `vercel.json` (`"regions": ["bom1"]`).

---

## 4. Environment Variable Configuration Status

Per strict safety guidelines, environment variable presence was verified safely without disclosing values or lengths:

| Variable | Status | Explanation |
| :--- | :--- | :--- |
| `UPSTASH_REDIS_REST_URL` | **NOT VERIFIED** | Not exposed in `/api/health` or public diagnostics. Cannot be directly observed via HTTP black-box inspection. |
| `UPSTASH_REDIS_REST_TOKEN` | **NOT VERIFIED** | Not exposed in `/api/health` or public diagnostics (by security design). |
| `RATE_LIMIT_KEY_SECRET` | **NOT VERIFIED** | Not exposed in telemetry. Code safely falls back to domain-separated derivation (`PropertyStudio:RateLimitKey:v1`) from `OTP_HASH_SECRET` in production if unset. |

---

## 5. Distributed Rate Limiting & Engine Audit

### A. Live Production Rate-Limit Engine Check
We performed safe, low-impact test requests against authentication endpoints:

1. **Test: `POST /api/auth/login` (Invalid Credentials)**
   - **HTTP Status:** `401 Unauthorized` (`{"error":"Invalid email or password."}`)
   - **Observed Headers:**
     ```http
     X-RateLimit-Engine: memory_fallback
     X-RateLimit-Limit: 5
     X-RateLimit-Remaining: 4
     ```

2. **Test: `POST /api/auth/register` (Incomplete Input)**
   - **HTTP Status:** `400 Bad Request` (`{"error":"Name, email, and password are required"}`)
   - **Observed Headers:**
     ```http
     X-RateLimit-Engine: memory_fallback
     X-RateLimit-Limit: 10
     X-RateLimit-Remaining: 9
     ```

### B. Root Cause Analysis
Inspection of `server.ts` explains why `memory_fallback` is active:
- In `src/server/rateLimit.ts:172-185`, `checkRateLimit` is correctly implemented to query Upstash Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist.
- In `src/server/rateLimit.ts:363-396`, `rejectIfRateLimitedAsync` is exported.
- However, in `server.ts:446-466`:
  ```typescript
  function rejectIfRateLimited(req: Request, res: Response, action: string, identity = ''): boolean {
    const limit = action === 'login' ? 5 : action === 'google-auth' ? 20 : action.includes('otp') ? 3 : 10;
    const windowMs = action.includes('otp') ? 5 * 60 * 1000 : 60 * 1000;
    const key = resolveRateKey(req, action, identity);
    const result = allowMemoryRequest(key, limit, windowMs); // <--- HARDWIRED TO LOCAL MEMORY
    res.setHeader('X-RateLimit-Engine', result.engine);
    ...
  }
  ```
- All routes in `server.ts` (`/api/auth/login`, `/api/auth/register`, `/api/auth/phone-otp`, etc.) invoke synchronous `rejectIfRateLimited`, which explicitly invokes `allowMemoryRequest`.
- As a result, the application code in `server.ts` bypasses Upstash Redis for rate limiting regardless of environment variable presence in Vercel.

### C. Implementation Verification (Code & Unit Tests)
- **Counter Atomicity:** `src/server/rateLimit.ts:111-115` constructs an atomic pipeline:
  ```json
  [["INCR", key], ["PEXPIRE", key, windowMs, "NX"], ["PTTL", key]]
  ```
  `PEXPIRE ... NX` guarantees expiration is set atomically on the initial hit.
- **Pseudonymization:** `src/server/rateLimit.ts:209-333` ensures zero PII in Redis keys:
  - Phone numbers are normalized to E.164 (`phone:+91...`).
  - Emails are normalized with prefix `email:...`.
  - Keys follow `ps:rl:<action>:<formattedIp>:id_<32-hex-hmac>`.
  - Production IP addresses are pseudonymized to `ip_<16-hex-hmac>`.
  - Unit tests in `tests/rate-limit-privacy.test.ts`: **18 / 18 PASS**.

---

## 6. Webhook Deduplication Audit

### A. Code Implementation Verification
Inspection of `src/server/webhookSecurity.ts:139-193`:
- Uses atomic Redis command:
  ```http
  POST /set/ps:wh:dedup:<cleanId>:<cleanType>/1/ex/86400/nx
  ```
- `NX` parameter ensures only the first receipt successfully writes to Redis and returns `"OK"`. Replayed callbacks return `null`, detecting duplicates with zero race conditions.
- `EX 86400` applies a 24-hour expiration window.
- In `server.ts:1584-1590`, duplicate events are acknowledged with `HTTP 200 {"success":true,"duplicate":true}` without executing database mutations or downstream actions.

### B. Live Runtime Status
- In `server.ts:1565`, `verifyWebhookSecret(provided)` is executed before deduplication.
- Unauthenticated callbacks receive `HTTP 401 Unauthorized` (`{"error":"Unauthorized: Invalid webhook secret token"}`).
- Live runtime Redis deduplication is **NOT VERIFIED** as test callbacks without authorized secrets are properly rejected.

---

## 7. Security Regression Test Suite

All tests executed live against production on 2026-11-19:

| Test Target | Request Method & Path | Expected Security Behavior | Live Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Direct Upload Gate** | `POST /api/media/upload-direct/test-intent` | Reject unauthenticated upload attempt | `HTTP 401 {"error":"Authentication required. Please sign in."}` | **PASS** |
| **RBAC Header Spoofing** | `GET /api/superadmin/audit-logs` (`x-admin-role: SUPER_ADMIN`, `x-user-role: SUPER_ADMIN`) | Reject spoofed headers, enforce session cookie | `HTTP 404 {"error":"Not found"}` | **PASS** |
| **Public Diagnostic Sanitization** | `GET /api/database/status` | Return status without leaking pool/host info | `HTTP 200 {"success":true,"status":"healthy"}` | **PASS** |
| **Frontend Security Headers** | `GET /` | Full HSTS, CSP, nosniff, frame denial | `HSTS: max-age=31536000`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `CSP: Present` | **PASS** |
| **API Security Headers** | `GET /api/auth/me` | HSTS, nosniff, clean null response | `HTTP 200 {"user":null}`, `HSTS`, `nosniff` | **PASS** |
| **Webhook Secret Enforcement** | `POST /api/webhooks/gupshup` | Reject unauthenticated webhook calls | `HTTP 401 {"error":"Unauthorized: Invalid webhook secret token"}` | **PASS** |

---

## 8. Remaining Limitations & Recommendations

1. **Rate Limiting Engine Disconnect in `server.ts`:**
   - *Limitation:* While `src/server/rateLimit.ts` contains the Upstash Redis pipeline logic, `server.ts` routes invoke `rejectIfRateLimited`, which calls `allowMemoryRequest`.
   - *Recommendation:* When authorized for development in a subsequent phase, migrate route handlers in `server.ts` to `await rejectIfRateLimitedAsync(req, res, action, identity)`.

2. **Serverless Region Mismatch (`iad1` vs `ap-south-1`):**
   - *Limitation:* Vercel functions execute in `iad1` (Washington D.C.), while Upstash Redis is in AWS Mumbai (`ap-south-1`).
   - *Recommendation:* Add `"regions": ["bom1"]` to `vercel.json` so Vercel executes serverless compute close to Redis and the primary database.

3. **Telemetry for Redis Status:**
   - *Limitation:* `/api/health` does not currently report Redis connectivity or distributed rate-limiting status.
   - *Recommendation:* Add a non-sensitive diagnostic indicator (e.g., `rateLimiter: getRateLimiterStatus()`) to `/api/health` or `/api/developer/status` in a future release.
