# Property Studio — Phase 4B.1: Upstash Redis Rate-Limiting & Webhook Deduplication Integration

**Author:** Security & Core Infrastructure
**Target Commit Base:** `6cff7e4f7bb20fd92db525de51ac51f03c2d9286`
**Status:** Verification & Local Integration Complete (Pending Production Deployment Approval)

---

## 1. Executive Summary

In Phase 4B verification, an audit of the live production environment (`https://psbysrj01.vercel.app`) revealed that despite Upstash Redis environment variables being configured in Vercel, the application returned `X-RateLimit-Engine: memory_fallback`.

### Confirmed Root Cause
In `server.ts`, all rate-limited route handlers were wired to the synchronous helper `rejectIfRateLimited(...)`, which explicitly invoked `allowMemoryRequest(key, limit, windowMs)`. The asynchronous Upstash Redis pipeline implementations in `src/server/rateLimit.ts` (`checkRateLimit`, `rejectIfRateLimitedAsync`) were never wired into the Express route handlers.

### Remediation Completed
1. Integrated `rejectIfRateLimitedAsync` into all **11 rate-limited route handlers** across `server.ts`.
2. Preserved existing limits, time windows, action names, HMAC-SHA-256 identity normalization, and HTTP 429 response bodies.
3. Updated the synchronous helper `rejectIfRateLimited` in `server.ts` to asynchronously delegate to `rejectIfRateLimitedAsync`, eliminating any silent memory fallback pathways.
4. Hardened `checkUpstashRedis` and `isWebhookEventDuplicate` with whitespace trimming, scheme validation, `finally { clearTimeout }` abort safety, and command-level error handling.
5. Added a dedicated automated test suite (`tests/rate-limit-redis.test.ts`) covering all 12 operational and failure modes (all 13 subtests PASS).
6. Verified full security test suite: **61 / 61 PASS** with zero regressions.
7. Verified clean TypeScript compilation (`tsc --noEmit`) and clean production build.

---

## 2. Complete Route Inventory

Every route dependent on rate-limiting was cataloged and migrated:

| # | HTTP Method & Path | Action Name | Limit | Window | Identity Source | Auth Gate | Error Response Code & Message |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `POST /api/auth/login` | `'login'` | 5 req | 60 sec | `email` (body) | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for login...") |
| **2** | `POST /api/auth/google` | `'google-auth'` | 20 req | 60 sec | IP / Anonymous | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for google-auth...") |
| **3** | `POST /api/auth/send-email-otp` | `'email-otp'` | 3 req | 300 sec | `email` (body) | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for email-otp...") |
| **4** | `POST /api/auth/verify-email-otp` | `'verify-email-otp'` | 3 req | 300 sec | `email` (body) | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for verify-email-otp...") |
| **5** | `POST /api/auth/forgot-password` | `'forgot-password'` | 10 req | 60 sec | `email` (body) | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for forgot-password...") |
| **6** | `POST /api/auth/reset-password` | `'reset-password'` | 10 req | 60 sec | `email` (body) | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for reset-password...") |
| **7** | `POST /api/auth/send-phone-otp` | `'phone-otp'` | 3 req | 300 sec | `phone` (normalized E.164) | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for phone-otp...") |
| **8** | `POST /api/auth/send-voice-otp` | `'phone-otp'` | 3 req | 300 sec | `phone` (normalized E.164) | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for phone-otp...") |
| **9** | `POST /api/auth/verify-phone-otp` | `'phone-otp-verify'` | 3 req | 300 sec | `phone` (normalized E.164) | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for phone-otp-verify...") |
| **10** | `POST /api/auth/register` | `'register'` | 10 req | 60 sec | `email` (body) | Public | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for register...") |
| **11** | `POST /api/auth/request-password-change-otp` | `'request-password-change-otp'` | 3 req | 300 sec | `req.user.id` | Authenticated | `429 RATE_LIMIT_EXCEEDED` ("Too many attempts for request-password-change-otp...") |

*Note: `send-phone-otp` and `send-voice-otp` share the `'phone-otp'` action key, preventing attackers from bypassing rate limits by switching channels.*

---

## 3. Before vs. After Architecture

### Before Phase 4B.1
```
Route Handler (e.g. POST /api/auth/login)
   │
   └──> rejectIfRateLimited (synchronous)
           │
           └──> allowMemoryRequest (local Map)
                   │
                   └──> res.setHeader('X-RateLimit-Engine', 'memory_fallback')
```
*Result:* Each serverless instance in Vercel maintained its own isolated in-memory counter; requests rotating between lambda instances did not enforce a shared global limit.

### After Phase 4B.1
```
Route Handler (e.g. POST /api/auth/login)
   │
   └──> await rejectIfRateLimitedAsync (asynchronous)
           │
           └──> checkRateLimit(key, limit, windowMs)
                   │
                   ├──> [If UPSTASH_REDIS_REST_URL configured]:
                   │       Upstash REST /pipeline (Atomic: INCR + PEXPIRE NX + PTTL)
                   │       ├── Success:
                   │       │     res.setHeader('X-RateLimit-Engine', 'upstash_redis')
                   │       └── Network/HTTP Failure (>1.8s timeout, 5xx, or disconnect):
                   │             res.setHeader('X-RateLimit-Engine', 'memory_fallback')
                   │             allowMemoryRequest(key, limit, windowMs) (Bounded Fail-Secure)
                   │
                   └──> [If unconfigured (dev/test)]:
                           res.setHeader('X-RateLimit-Engine', 'memory_fallback')
                           allowMemoryRequest(key, limit, windowMs)
```

---

## 4. Files Modified

1. **`server.ts`**:
   - Replaced synchronous memory checks in all 11 routes with `if (await rejectIfRateLimitedAsync(req, res, ...)) return;`.
   - Updated helper `rejectIfRateLimited` to be asynchronous and delegate to `rejectIfRateLimitedAsync`.
2. **`src/server/rateLimit.ts`**:
   - Aligned tier resolution in `rejectIfRateLimitedAsync` to preserve exact limits (`login`: 5/60s, `otp`: 3/300s, `google-auth`: 20/60s, default/register: 10/60s).
   - Standardized 429 response message: `Too many attempts for ${action}. Please wait ${result.retryAfterSeconds} seconds and try again.`
   - Hardened `checkUpstashRedis` with input trimming, URL scheme validation, command-level error checks, and `finally { clearTimeout(timeoutId) }`.
3. **`src/server/webhookSecurity.ts`**:
   - Hardened `isWebhookEventDuplicate` with whitespace trimming, scheme validation, and `finally { clearTimeout(timeout) }`.
4. **`tests/rate-limit-redis.test.ts`**:
   - Added 12 comprehensive unit test scenarios (13 assertions) testing Redis success, rejection thresholds, counter expiration, concurrency, timeout fallback, recovery, engine headers, HMAC privacy, and webhook deduplication.

---

## 5. Redis Failure Policy & Graceful Degradation

- **Timeout Safety:** All Upstash calls use an `AbortController` signal with a strict **1.8-second timeout** (1.5 seconds for webhooks).
- **Graceful Fallback:** If Upstash is unreachable, returns HTTP non-200, or times out, the error is caught, logged safely without secrets, and execution delegates to `allowMemoryRequest`.
- **Bounded Memory:** The memory fallback store actively prunes expired keys every 60 seconds and caps total keys at 5,000, preventing serverless memory exhaustion.
- **Immediate Recovery:** The engine does not lock into fallback mode permanently; subsequent requests query Redis again immediately upon network recovery.
- **Telemetry Transparency:** The `X-RateLimit-Engine` response header reports `upstash_redis` when Redis answered, or `memory_fallback` if fallback occurred.

---

## 6. Automated Verification Results

### Unit & Security Test Execution
1. **`npx tsx --test tests/rate-limit-redis.test.ts`**:
   - 13 / 13 PASS (424ms duration)
2. **Full Security Suite Run**:
   - `tests/security-phase2.test.ts`
   - `tests/security-phase3.test.ts`
   - `tests/rate-limit-privacy.test.ts`
   - `tests/rate-limit-redis.test.ts`
   - **Result:** **61 / 61 PASS** (0 failures, 2.51s duration)
3. **TypeScript Compilation**:
   - `npm run lint` (`tsc --noEmit`): **0 errors**.
4. **Production Build**:
   - `npm run build`: Vite client built in 1.43s; esbuild server bundled in 117ms. Clean output.

---

## 7. Post-Deployment Verification Procedure

After authorization and deployment to production, execute the following non-destructive verification:

1. **Verify Live Commit:**
   ```bash
   curl -s https://psbysrj01.vercel.app/api/health | jq .deployment
   ```
   Confirm deployed commit matches the Phase 4B.1 commit hash.

2. **Verify Active Rate-Limit Engine on Login:**
   ```bash
   curl -s -i -X POST https://psbysrj01.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"verify-phase4b1@propertystudio.org","password":"invalid-test-password"}' | grep -i x-ratelimit
   ```
   *Expected Response:*
   ```http
   X-RateLimit-Engine: upstash_redis
   X-RateLimit-Limit: 5
   X-RateLimit-Remaining: 4
   ```

3. **Verify Active Rate-Limit Engine on Registration:**
   ```bash
   curl -s -i -X POST https://psbysrj01.vercel.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"verify-phase4b1@propertystudio.org"}' | grep -i x-ratelimit
   ```
   *Expected Response:*
   ```http
   X-RateLimit-Engine: upstash_redis
   X-RateLimit-Limit: 10
   X-RateLimit-Remaining: 9
   ```

4. **Verify Shared Counter Synchronization Across Regions:**
   Send two rapid consecutive requests from different networks or IP headers. Verify `X-RateLimit-Remaining` decrements across distributed lambda invocations.

5. **Verify Security Invariants Intact:**
   - Confirm unauthenticated direct upload is rejected (`401`).
   - Confirm spoofed admin headers receive `404`.
   - Confirm security headers (`HSTS`, `CSP`, `nosniff`, `DENY`) remain intact.
