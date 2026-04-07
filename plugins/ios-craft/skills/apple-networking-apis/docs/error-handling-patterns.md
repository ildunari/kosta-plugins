# Error Handling Patterns

A robust network layer distinguishes transport, protocol, and business errors.

## Taxonomy

- **Transport**: `URLError` family (timeouts, DNS, TLS). Transient.
- **HTTP**: Non-2xx responses. Map 401/403 to auth states; treat 408/429/5xx as retryable (with bounds).
- **Decoding**: JSON schema mismatches; log sample payloads (redacted).
- **Cancellation**: User canceled navigations or refresh. Do not surface as error to users.
- **Business**: Application-specific error envelopes (e.g., RFC 7807 `application/problem+json`).

## Mapping Strategy

Create `NetworkError` with associated data and a factory that maps `Error` → `NetworkError`. Always preserve the underlying error for diagnostics.

## Resilience

- Retry only idempotent operations by default.
- Exponential backoff with **full jitter** and a cap.
- Respect `Retry-After` for 429/503.
- Timeouts: separate request vs resource; do not make them equal.

## Observability

- Correlate requests with IDs and include attempt counts.
- Redact Authorization, cookies, and PII.
- Capture response samples (first N bytes) for decode failures.

