# Concurrency Performance

- Map user impact to QoS classes for GCD queues. citeturn16search15
- Use `OperationQueue` for dependencies and cancellation. citeturn9search4
- Prefer structured concurrency (`async let`, `TaskGroup`) for clarity; know that priority is advisory. citeturn16search2turn16search13
- Offload long CPU‑bound work to dedicated queues to avoid starving the cooperative thread pool. citeturn16search3
