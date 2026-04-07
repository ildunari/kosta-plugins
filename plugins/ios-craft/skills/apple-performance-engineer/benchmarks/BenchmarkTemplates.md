# Benchmark Templates

- Use `XCTClockMetric`, `XCTCPUMetric`, `XCTMemoryMetric`, and `XCTOSSignpostMetric` in `measure(metrics:)`. citeturn18search2
- Default to 5 iterations; increase for noisy workloads.
- Provide representative payloads and avoid network flakiness.
