# PROPERTY STUDIO — SECURITY PHASE 4 PREFLIGHT READ-ONLY AUDIT
**Document ID:** `PS-SEC-PHASE4-PREFLIGHT`  
**Audit Date:** November 19, 2026  
**Auditor:** Antigravity AI Security Architecture Team  
**Scope:** Read-Only Audit of Production State (`b630d6c`), Upstash Readiness, and Cloudflare Architecture  
**Production URL:** `https://psbysrj01.vercel.app`  
**Repository:** `thekolli-tech/psbysrj01` (Branch: `main`)  

---

## 1. CONFIRMED PRODUCTION STATE

Direct read-only telemetry probes against `https://psbysrj01.vercel.app/api/health` confirm:

* **Deployed Commit Hash:** `b630d6cad1f5b29813951e9725bca8e4a8b4b1eb` (`b630d6c`)
* **Authoritative Database:** PostgreSQL (`pooled.db.prisma.io:5432 / postgres`)
* **PostgreSQL Schema Status:** Connected, ready, 0 missing tables, latency 237ms
* **Local SQLite Mode:** `sqliteFallback: false` (PostgreSQL is 100% authoritative in production)
* **Production Status:** `OK`
* **Security Headers Verification:**
  * `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (Enforced)
  * `X-Content-Type-Options: nosniff` (Enforced)
  * `X-Frame-Options: DENY` (Enforced)
  * `Referrer-Policy: strict-origin-when-cross-origin` (Enforced)
  * `Permissions-Policy: camera=(), microphone=(), geolocation=()` (Enforced)
  * `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://player.vimeo.com; ...` (Enforced)
* **Application Invariants Verified:**
  * Unauthenticated media uploads to `/api/media/upload-direct/:uploadId` $\rightarrow$ Rejected with `401 Unauthorized` (`{ error: "Authentication required. Please sign in." }`).
  * Administrative requests with spoofed `x-admin-role: SUPER_ADMIN` $\rightarrow$ Rejected with `404 Not Found` / `401 Unauthorized`. Zero header trust.
  * Public diagnostic endpoints (`/api/database/status`) $\rightarrow$ Sanitized to `{ success: true, status: "healthy" }`. Zero table schemas, connection pools, or query metrics exposed.
  * Webhook protection (`/api/webhooks/gupshup`) $\rightarrow$ Rejected with `401 Unauthorized` (`{ error: "Unauthorized: Invalid webhook secret token" }`).

---

## 2. INVESTIGATION OF PREVIOUS FAILED CHECK (`GET /api/auth/me`)

During the Phase 3 post-deployment verification, the background check for `GET /api/auth/me` reported:
```
Status: 200
Headers: undefined max-age=31536000; includeSubDomains; preload
node:events:487
      throw er; // Unhandled 'error' event
      ^
Error: read ECONNRESET
    at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20)
```

### 2.1 Root Cause Analysis
1. **Production Server Responded Successfully (`HTTP 200 OK`)**:
   * The live Vercel serverless function executed normally and returned HTTP 200 with `{ user: null }` (standard guest identity detection).
   * All security headers were attached to the response (`Strict-Transport-Security`, `CSP`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`).
2. **Client Script Stream Teardown Failure**:
   * The diagnostic one-liner used Node.js `https.get(url, (res) => { ... })` and logged headers without attaching a `'data'` event listener or calling `res.resume()`.
   * When the Vercel serverless worker completed, it closed the TCP/TLS socket.
   * Because unread bytes remained in the client socket buffer, the Node.js runtime raised an unhandled `ClientRequest` `'error'` event (`ECONNRESET`), causing Node to exit with code 1.
3. **Consistency Verification**:
   * Subsequent probes reading the full response stream (`res.on('data')`, `res.on('end')`) confirm **100% consistent security headers** across:
     * Frontend root: `/` (200 OK)
     * API health: `/api/health` (200 OK)
     * Guest session: `/api/auth/me` (200 OK)
     * Sanitized database status: `/api/database/status` (200 OK)
     * Not found page: `/non-existent-404-page` (200 OK via SPA fallback)
   * **Conclusion**: This was an unhandled stream consumption error in the temporary verification one-liner, **not a production vulnerability or missing security header**.

---

## 3. SECURITY FINDINGS & RISK CLASSIFICATION

| Finding ID | Classification | Component | Description & Impact | Recommended Mitigation |
| :--- | :---: | :--- | :--- | :--- |
| **FINDING-P4-01** | **CRITICAL** | Cloudflare Edge / Uploads | **Cloudflare Free tier enforces a 100MB body limit (`client_max_body_size 100M`).** Property Studio supports video uploads up to 700MB. Direct upload of files $>100$MB proxied through Cloudflare Free will be immediately aborted at Cloudflare's edge with HTTP 413. | Route media upload endpoints via direct-to-storage signed URLs or maintain an unproxied DNS record (`upload.propertystudio.org` Grey Cloud) for large payloads. |
| **FINDING-P4-02** | **HIGH** | Edge Origin Shielding | **Direct Origin Access:** The default deployment origin `https://psbysrj01.vercel.app` remains directly accessible on the public Internet. Attackers discovering this hostname bypass all Cloudflare WAF, DDoS, and Bot protection. | Implement an Origin Verify header (`X-Origin-Verify`) in Cloudflare Transform Rules and reject or redirect requests on `psbysrj01.vercel.app` to the apex custom domain. |
| **FINDING-P4-03** | **HIGH** | Gupshup Webhooks / Edge WAF | **Bot Fight Mode False Positives:** Cloudflare Bot Fight Mode or Managed Challenges can flag carrier WhatsApp DLR delivery webhooks as automated bots, blocking status updates with HTML challenges. | Create a WAF Skip Rule explicitly bypassing Bot Fight Mode and Challenges for URI paths `/api/webhooks/*` and `/api/auth/whatsapp-callback`. |
| **FINDING-P4-04** | **MEDIUM** | Upstash Rate Limiting | **PII in Redis Keys:** Rate limit keys currently store unhashed email addresses and phone numbers (e.g. `ps:rl:login:<ip>:<email>`). While short-lived, plaintext PII is visible in Redis dashboards and slowlogs. | Hash all identity strings with SHA-256 (`ps:rl:<action>:<ip>:<sha256(identity)[:16]>`) before key construction. |
| **FINDING-P4-05** | **MEDIUM** | Cloudflare Edge / SSE | **Response Buffering on Server-Sent Events:** Cloudflare proxy buffers streaming HTTP responses by default. Community live updates (`/api/live/stream`) could experience latency or stuttered delivery. | Send `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform` on SSE stream endpoints. |
| **FINDING-P4-06** | **LOW** | Client Diagnostics | **Socket Stream Reset on Diagnostic Probes:** One-line CLI HTTP tools that fail to consume the incoming HTTP readable stream receive `ECONNRESET` when serverless containers terminate. | Use standard HTTP client scripts with explicit `res.resume()` or stream consumption. |
| **FINDING-P4-07** | **LOW** | Rate Limit Resilience | **In-Memory Fallback Non-Distributed Across Containers:** Until Upstash Redis is provisioned, rate limits run on per-container memory stores. | Platform owner provisions `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. |

---

## 4. UPSTASH REDIS READINESS & ARCHITECTURAL AUDIT

### 4.1 Implementation Status
* **Rate Limiting Engine (`src/server/rateLimit.ts`):** Fully implemented using Upstash Redis HTTP REST `/pipeline` endpoint (`INCR`, `PEXPIRE key windowMs NX`, `PTTL`).
* **Webhook Deduplication (`src/server/webhookSecurity.ts`):** Fully implemented using Upstash Redis atomic `/set/key/1/ex/86400/nx`.
* **Zero Dependency on Native TCP Sockets:** Both modules communicate over standard HTTPS (`fetch`), eliminating TCP socket timeouts and connection pool exhaustion in serverless runtimes.
* **Fail-Secure Architecture:** If Upstash is offline, misconfigured, or times out (strict 1.8s timeout on rate limits, 1.5s on webhooks), the application automatically falls back to bounded local memory stores without dropping protections or failing requests.

### 4.2 Exact Configuration Requirements for Platform Owner
To activate distributed protection, set the following two environment variables in **Vercel Dashboard $\rightarrow$ Project Settings $\rightarrow$ Environment Variables**:

1. `UPSTASH_REDIS_REST_URL`
   * Format: `https://<unique-id>.upstash.io`
   * Environments: **Production**, **Preview**, **Development**
2. `UPSTASH_REDIS_REST_TOKEN`
   * Format: `AXxxxx...` (Bearer token)
   * Environments: **Production**, **Preview**, **Development**

*No code modifications, dependency installations, or build changes are needed. Once these variables are saved in Vercel and a redeployment occurs, the application automatically engages Upstash.*

---

## 5. CLOUDFLARE MIGRATION & EDGE ARCHITECTURE

### 5.1 DNS Record Inventory
Configure the following in the Cloudflare DNS dashboard:

| Type | Name | Content / Target | Proxy Status | Purpose |
| :--- | :--- | :--- | :---: | :--- |
| **CNAME** | `@` (Apex) | `cname.vercel-dns.com` | **Proxied (Orange Cloud)** | Custom apex domain routing through Cloudflare edge |
| **CNAME** | `www` | `cname.vercel-dns.com` | **Proxied (Orange Cloud)** | Canonical www subdomain |
| **CNAME** | `upload` *(Optional)* | `cname.vercel-dns.com` | **DNS Only (Grey Cloud)** | Dedicated bypass endpoint for media uploads $>100$MB |
| **TXT / MX** | Various | Provider records (Google Workspace / Resend) | **DNS Only (Grey Cloud)** | Email delivery & SPF/DKIM verification |

### 5.2 Cloudflare Settings Configuration Checklist
1. **SSL/TLS Encryption Mode:**
   * Set to **Full (Strict)**.
   * *Rationale:* Vercel automatically manages valid Let's Encrypt certificates for custom domains. Full (Strict) enforces end-to-end cryptographic verification and prevents man-in-the-middle attacks between Cloudflare and Vercel.
2. **Minimum TLS Version:**
   * Set to **TLS 1.2** (or TLS 1.3).
3. **Cache Rules (CRITICAL FOR SESSIONS & APIS):**
   * Rule Name: `Bypass API & Auth Caching`
   * Expression: `(http.request.uri.path starts_with "/api/")`
   * Cache Eligibility: **Bypass Cache**
   * *Rationale:* Prevents Cloudflare edge from caching dynamic user JSON responses, CSRF tokens, or session payloads.
4. **WAF Custom Rule 1 (Webhook Exemption):**
   * Rule Name: `Skip WAF for WhatsApp & Webhooks`
   * Expression: `(http.request.uri.path starts_with "/api/webhooks/") or (http.request.uri.path eq "/api/auth/whatsapp-callback")`
   * Action: **Skip** (Select: WAF Managed Rules, Bot Fight Mode).
   * *Rationale:* Ensures carrier delivery reports are never dropped due to bot challenges.
5. **WAF Custom Rule 2 (Auth Rate Limiting):**
   * Rule Name: `Auth Route Rate Limiting`
   * Expression: `(http.request.uri.path starts_with "/api/auth/login") or (http.request.uri.path starts_with "/api/auth/request-phone-otp")`
   * Action: **Rate Limit (Challenge)**: Max 20 requests per minute per IP.
6. **Origin Cloaking Rule:**
   * Add Cloudflare Transform Rule to inject header `X-Origin-Verify: <custom-secret>`.
   * Vercel Express middleware validates this header, redirecting unauthenticated direct hits to `psbysrj01.vercel.app` back to the apex domain.

---

## 6. POTENTIAL DEPLOYMENT RISKS & MITIGATION PLAN

| Risk | Probability | Impact | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **100MB Upload Cloudflare Free Limitation** | High | High | For files $>100$MB, use signed Google Drive resumable upload links direct from client, or route via unproxied subdomain (`upload.propertystudio.org`). |
| **DNS Cutover Propagation Window** | Low | Low | Set DNS TTL to 300 seconds (5 minutes) 24 hours prior to changing nameservers. |
| **Google OAuth Redirect URI Mismatch** | Medium | Medium | Add custom domain callback URLs (`https://propertystudio.org/api/auth/google/callback` and `https://propertystudio.org/api/media/drive-oauth/callback`) in Google Cloud Console *before* DNS migration. |
| **Instant Rollback Capability** | Low | Low | Setting Cloudflare proxy from Orange Cloud to Grey Cloud (DNS Only) restores direct Vercel routing in $<60$ seconds. |

---

## 7. RECOMMENDED PHASE 4 EXECUTION ORDER

1. **Step 4A — Upstash Redis Activation (Zero Code Changes):**
   * User creates Upstash database and enters `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into Vercel Dashboard.
   * Trigger non-destructive probe to verify `X-RateLimit-Engine` flips to `upstash_redis`.
2. **Step 4B — Rate Limit Key PII Hardening (Application Level):**
   * Hash identity parameters (email/phone) with SHA-256 before key generation in `src/server/rateLimit.ts`.
   * Add regression test asserting that raw emails/phone numbers never appear in Redis keys.
3. **Step 4C — Cloudflare Custom Domain Integration (DNS & Edge Level):**
   * Add custom domain in Vercel Project Settings.
   * Configure Cloudflare DNS records with **Full (Strict)** SSL/TLS mode.
   * Configure Cache Bypass Rule on `/api/*`.
   * Configure WAF Webhook Skip Rule for `/api/webhooks/*`.
4. **Step 4D — Media Upload Architecture for $>100$MB Payloads:**
   * Direct-to-storage signed client upload for large video files to guarantee compatibility with Cloudflare's 100MB edge ceiling.
5. **Step 4E — Production End-to-End Adversarial Validation:**
   * Verify rate-limit burst rejection across distributed Vercel lambdas.
   * Verify Gupshup webhook delivery and deduplication under edge proxy.
   * Verify complete application functionality (auth, programs video, testimonials, community forum).

---

## 8. VERIFICATION COMMANDS & ACCEPTANCE CRITERIA

### Automated Test Verification
```bash
npx tsx --test tests/security-phase3.test.ts tests/security-phase2.test.ts
npm run lint
npm run build
```
*Acceptance Criteria:* 86/86 tests pass, 0 TypeScript errors, clean production bundle.

### Upstash Redis Live Verification Probe
```bash
curl -I -X POST https://psbysrj01.vercel.app/api/auth/login -H "Content-Type: application/json" -d "{}"
```
*Acceptance Criteria:* Response header includes `X-RateLimit-Engine: upstash_redis`.

### Cloudflare Edge Verification Probes
```bash
# 1. Verify Full Strict TLS & Cloudflare Proxy
curl -I https://propertystudio.org/api/health
# Response must include CF-Ray header and Strict-Transport-Security

# 2. Verify API Cache Bypass (Must return cf-cache-status: DYNAMIC or BYPASS, NEVER HIT)
curl -I https://propertystudio.org/api/properties
# Response must include cf-cache-status: DYNAMIC / BYPASS

# 3. Verify Gupshup Webhook Rejection without Secret
curl -s -o /dev/null -w "%{http_code}" -X POST https://propertystudio.org/api/webhooks/gupshup
# Response must be 401 Unauthorized (NOT 403 Cloudflare Challenge)
```

---
*Certified by Antigravity AI Security Architecture Team.*  
*Ready for Phase 4 Execution upon User Authorization.*
