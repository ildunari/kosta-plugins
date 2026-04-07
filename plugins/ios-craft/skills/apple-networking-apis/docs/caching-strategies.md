# Caching Strategies

HTTP caching is a contract between client and server. Respect it.

## URLCache

- Configure a `URLCache` with appropriate disk and memory sizes. `URLCache` supports both memory and on‑disk storage; customizing it improves offline support and reduces redundant API calls【169595510815021†L74-L119】.
- Set up a global cache on app launch: assign `URLCache.shared = URLCache(memoryCapacity: <bytes>, diskCapacity: <bytes>)` before creating your sessions to tune cache capacity【169595510815021†L155-L171】.
- Default `useProtocolCachePolicy` allows the server to control freshness; avoid `.reloadIgnoringLocalCacheData` unless debugging.
- For privacy, use `.ephemeral` sessions (no persistent cache).

## Validators

- Prefer `ETag` + `If-None-Match`. The `ETag` is an opaque identifier representing a specific version of a resource; when the client sends `If-None-Match` with the stored ETag and the resource hasn't changed, the server can respond with `304 Not Modified` to save bandwidth【130744205816600†L188-L196】【130744205816600†L252-L261】.
- Fallback to `Last-Modified` + `If-Modified-Since` when ETags are unavailable.
- Avoid caching error responses unless explicitly allowed.

## Patterns

- **stale‑while‑revalidate**: Serve cached content immediately and start a background refresh. Use concurrency (e.g., `Task {}` or `TaskGroup`) to refresh data while presenting stale content.
- Separate caches for API vs media if policies differ.
- Consider language/locale as a cache key variant when content varies by `Accept-Language`.
- Install per‑session caches (`URLSessionConfiguration.urlCache`) when working with multiple backend services that require different retention or capacity policies.

## Troubleshooting

- 304s not returned? Verify the request includes `If-None-Match` with the correct ETag and the server issues strong/weak ETags consistently.
- Cache misses after app restart: ensure `URLCache` diskCapacity is non-zero and not exceeded by large assets.
- Aggressive CDN caching? Ensure `Cache-Control: private` for user-specific resources.

