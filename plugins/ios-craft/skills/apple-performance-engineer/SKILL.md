---
name: apple-performance-engineer
user-invocable: false
description: >
  Use when an iOS or macOS app has a performance problem or needs profiling
  guidance, especially for startup time, scrolling or animation hitches,
  memory growth, energy use, build time, app size, Instruments traces,
  SwiftUI/UIKit/AppKit rendering cost, or regression measurement. Do not use
  for general bug fixing without a clear performance angle.
version: 1.0.0
tags:
  - iOS
  - macOS
  - performance
  - Instruments
  - Swift
  - SwiftUI
  - GCD
  - CoreAnimation
  - Metal
---

# Apple Performance Engineer — Skill

> Make performance a product feature. This skill turns Claude into a hands-on performance specialist for Apple platforms.

## Overview

This skill provides **end‑to‑end guidance and tooling** for identifying, measuring, and fixing performance issues in iOS/macOS apps. It covers:
- Profiling methodology and workflows (CPU, memory, power, GPU).
- Deep dives into **Instruments**: *Time Profiler, Allocations, Leaks, Energy/Power, Animation Hitches*.
- **SwiftUI** and **UIKit** rendering performance patterns.
- Concurrency (GCD, `OperationQueue`, Structured Concurrency) tradeoffs.
- Startup time, build time, and app size optimization.
- Real‑world case studies and **benchmark templates** with regression detection.
- Production‑ready **scripts/** to parse traces, build logs, and memory exports.

> Background: Use Time Profiler and Hitches to find slow paths and animation interruptions; Allocations/Leaks to track memory growth and leaks; Power Profiler (or Energy templates) to assess energy impact; integrate XCTest metrics to catch regressions. citeturn7search7turn18search16turn7search1turn7search6turn18search2

## When to Profile

Profile when any of the following are true:
- Cold/warm launch time is slow; first screen takes > 1–2 s to interact. Use Launch metrics and signposts. citeturn12search15turn12search2
- Scrolling hitches or dropped frames; animation feels “sticky”. Use the **Hitches** instrument or XCTest animation metrics. citeturn18search16
- Memory spikes or OOMs on heavy screens. Use Allocations, Leaks, and the Memory Graph. citeturn7search13turn7search1
- Battery drains or thermal throttling. Use Power Profiler / Energy diagnostics. citeturn7search6turn7search19
- Build times growing; developers waiting > 20–30% of day. Use Xcode’s build timing summary and module boundaries. citeturn10search0turn10search4

### Minimum viable profiling loop
1. **Repro** the issue with a stable scenario and device.
2. **Instrument** with the right template (see next section).
3. **Record** multiple runs (30–60 s for runtime issues) to capture variance.
4. **Analyze** call trees, signposts, and counters.
5. **Hypothesize → fix → re‑measure** with the same scenario, device, and metrics.
6. **Automate** with XCTest performance tests + `scripts/regression_detector.py`.

## Instruments Deep Dive

### Time Profiler (CPU)
- **What**: Samples the CPU to reveal where time is spent. Flame graphs and call trees show hot paths. citeturn7search7
- **When to apply**: Jank under interaction, long tasks on the main thread, heavy parsing/decoding, tight loops.
- **How to measure**: Record with Time Profiler; enable “record waiting” to catch locks; correlate with **Points of Interest** signposts. citeturn12search4
- **Expected improvements**: 20–80% on targeted hot functions after algorithmic improvements or moving work off the main queue.

### Allocations
- **What**: Tracks allocation/free events and memory growth over time. citeturn7search13
- **When**: Memory growth, spikes while scrolling, image-heavy screens.
- **Measure**: Watch live heap size, VM regions; inspect **Call Tree** to find allocating sites; export CSV/JSON for scripts. citeturn7search1
- **Expected**: 10–50% peak reduction by downsampling large images, caching decoded images, or scoping lifetimes.

### Leaks
- **What**: Periodic snapshots detect leaked objects not referenced by your code. citeturn7search3
- **When**: Gradual memory growth with long sessions; suspected retain cycles.
- **Measure**: Add the **Leaks** instrument alongside Allocations; confirm with Memory Graph. citeturn7search1
- **Expected**: Stabilized memory footprint; fewer OOMs and smoother long sessions.

### Energy / Power
- **What**: Power Profiler (and historical Energy diagnostics) measure subsystem usage (CPU, GPU, networking, location) driving energy impact. citeturn7search6
- **When**: Battery complaints; background tasks; media playback; location polling.
- **Measure**: Record power traces; correlate spikes with signposts; reduce wakeups and polling intervals. citeturn7search6
- **Expected**: 10–40% power savings by batching work, reducing timers, and coalescing I/O.

### Animation Hitches
- **What**: Detects interruptions to smooth animations/scrolling and points to the root cause. citeturn18search16
- **When**: Scroll stutters; transitions hitch.
- **Measure**: Run the Hitches / XCTest animation metrics, align with Time Profiler and Core Animation events. citeturn18search16
- **Expected**: 2× smoother interactions after fixing main‑thread stalls, offscreen passes, or layout thrash.

## Memory Optimization

- **Downsample large images** using `CGImageSourceCreateThumbnailAtIndex` to match display size and avoid decoding huge bitmaps. citeturn15search8  
  **Measure**: Allocations graph + `vmmap` before/after; expect 3–10× less per‑image memory. citeturn15search10
- **Cache decoded images** (NSCache) and avoid repeated decoding on scroll. Measure dropped allocations and hitch rate.
- **Avoid accidental retains** (closures, timers, Combine pipelines). Measure with Memory Graph + Leaks.
- **Use value types** where appropriate; reduce reference counting churn in hot loops.
- **Autoreleasepool** around tight loops that bridge to Obj‑C heavy code or Foundation I/O. citeturn14search5turn14search1

## Autoreleasepool Usage

- **When to apply**: Long loops that create many temporary Foundation objects (e.g., image processing, file I/O), or background threads without a runloop. citeturn14search5
- **How to measure**: Allocations live graph for heap peaks; compare with and without `autoreleasepool {}`.
- **Expected improvements**: Lower peak memory by 20–60% in bursty loops; minor CPU overhead; limited effect for pure Swift types. citeturn14search0turn14search14

## View Rendering Optimization

- **Avoid offscreen passes**: round corners + masks + shadows can trigger offscreen rendering. Prefer `shadowPath`, precomposited images, or rasterize selectively. citeturn9search5turn9search22
- **Opaque when possible**: set `isOpaque = true` and minimize alpha blending. Measure with Core Animation instruments.
- **Batch updates** in `UITableView`/`UICollectionView`; use prefetching APIs. citeturn21search13turn21search0

## SwiftUI Performance

- **Layout Cycle**: Understand identity vs. state changes; minimize unnecessary invalidations. Use the SwiftUI instrument to visualize updates. citeturn8search3turn8search1
- **View Identity**: Control identity with `.id(_:)` only when you truly want to reset state. Misuse forces view recreation. citeturn8search10
- **Equatable**: Use `.equatable()` or `EquatableView` to skip updates when inputs don’t change; ensure inputs conform to `Equatable`. citeturn17search4turn17search0
- **Lazy Containers**: Use `LazyVStack/LazyHGrid` for long lists to bound memory. Measure with Hitches and Allocations. citeturn17search1

## UIKit Performance

- **Cell reuse** and **prefetching** with `UITableViewDataSourcePrefetching` and `UICollectionViewDataSourcePrefetching`. citeturn21search0turn21search1
- **Height/size caching** for dynamic cells; avoid repeated layout passes.
- **Avoid overdraw**: flatten hierarchies, prefer opaque backgrounds, minimize layer effects.

## Lazy Loading Strategies

- Defer expensive work until needed (images, heavy view trees).
- Use prefetch delegates for lists and start I/O early. citeturn21search0
- For SwiftUI, prefer `LazyVStack` and paginate data.

## Image Optimization

- **Downsample** with Image I/O (see code in `swift/ImageOptimizationTechniques.swift`). citeturn15search8
- **Prefer asset catalogs** for variants and slicing; use SF Symbols when possible.
- **Measure** with Allocations; expect drastic peak reductions when replacing full‑size decodes with downsampled thumbnails. citeturn15search10

## Grand Central Dispatch (Queue Priorities, QoS)

- **QoS** communicates user impact: `.userInteractive`, `.userInitiated`, `.utility`, `.background`. Choose the lowest QoS that meets UX needs. citeturn9search8turn16search15
- Avoid creating too many private queues; build hierarchies with `target` queues; avoid changing QoS after creation. citeturn9search20

## OperationQueue Patterns

- Use `Operation` for cancellation, dependencies, and composition; set `qualityOfService` to match user impact. citeturn9search4
- Combine with `URLSession` and caches for image pipelines.

## Structured Concurrency Performance

- Prefer **structured concurrency** for clarity; use `TaskGroup`/`async let` to parallelize independent work. citeturn16search2
- Understand that task priority is **advisory**; don’t rely on it as a hard schedule. citeturn16search13
- CPU‑bound work may require dedicated Dispatch queues; the cooperative thread pool isn’t ideal for long CPU hogs. citeturn16search3

## Metal Basics (Shaders, Compute)

- Use Metal and Metal Performance Shaders for GPU‑accelerated rendering/compute; profile with GPU counters & Metal System Trace. citeturn13search2turn13search18
- Optimize shaders by minimizing memory traffic, using function constants, and exploiting tile‑based architectures on Apple GPUs. citeturn13search12turn13search13

## Core Animation (Rasterization, Offscreen Rendering, Layer Composition)

- Cut offscreen passes where possible; consider `shouldRasterize` selectively for complex static content. Measure with Hitches + Time Profiler. citeturn9search5
- Provide `shadowPath` and avoid `masksToBounds` with shadows; pre-render rounded corners if needed. citeturn21search11

## Layout Performance

- Cache layout results (cell heights, attributed string sizes).
- Avoid layout in hot scroll paths; precompute in background; coalesce updates.

## Caching Strategies

- Use `NSCache` for transient images/layouts; key by content signature.
- Persist decoded thumbnails on disk; validate with UUID/ETag.

## Startup Time Optimization

- **Measure** using Launch metrics, signposts, and the App Launch instrument. Keep critical path minimal; delay non‑essential work. citeturn12search15
- Avoid heavy I/O, synchronous decoding, and global singletons on the main path.

## Build Time Optimization (Module Boundaries, Incremental Builds)

- Split monolithic targets; simplify dependencies; prefer incremental builds for Debug and WMO for Release. citeturn10search0turn10search16
- Audit Run Script phases and declare outputs to avoid needless rebuilds. citeturn10search17
- Use the Build Timing Summary and logs to find slow Swift files; add type annotations where inference explodes. citeturn10search4turn10search3

## App Size Optimization

- Use **App Thinning** (slicing, on‑demand resources); optimize assets via catalogs. citeturn11search0turn11search2
- Bitcode is deprecated in modern Xcode; don’t rely on it for size optimization. citeturn11search1

## Best Practices

- **Measure first**; change one thing at a time; keep baselines.
- **Automate** perf tests in CI with `XCTest` metrics (CPU, memory, clock, signposts). citeturn18search2
- **Document** fixes and link to traces so future regressions are obvious.

## Anti‑Patterns

- Doing heavy work on the main actor/queue; blocking animations.
- Excessive view identity resets in SwiftUI with `.id(_:)`. citeturn8search10
- Decoding original‑size images on scroll; no caching.
- Overusing `shouldRasterize` (creates memory pressure and blurs dynamic content).

## Profiling Methodology

- Choose **scenario**, **device**, **OS**, **build**; record ≥3 runs.
- Instrument with **signposts** (`OSSignposter`) around suspect tasks to anchor timelines. citeturn12search2
- Export traces (`xcrun xctrace export`) and analyze with `scripts/instruments_analyzer.py`. citeturn19view0

## Bottleneck Identification

- **CPU**: High self‑time on main thread; lock contention; expensive string/image ops.
- **Memory**: Growth without bound; many short‑lived allocations; images > display needs.
- **GPU**: Offscreen passes; overdraw; long shader times; CPU‑GPU sync stalls.
- **Power**: Frequent timers/wakeups; unnecessary background work; chatty networking.

## Real‑World Case Studies

See `case-studies/` for cold‑start, scrolling jank, and memory spike write‑ups — each includes steps, traces, and code fixes.

## Production Tooling in this Skill

- `scripts/` — analyzers for Instruments exports, memory, layout signposts; build time parsers; regression detector.
- `swift/` — copy‑pasteable patterns with signpost helpers and benchmarks.
- `benchmarks/` — XCTest perf tests (launch, scrolling, CPU/memory, signposts).
- `templates/` — `xctrace` command recipes and preset configs.
- `docs/` — How‑tos, checklists, and a profiling cookbook.

## References

- Instruments and power profiling, SwiftUI performance, and XCTest metrics were consulted from Apple Developer docs and WWDC sessions. citeturn7search7turn7search6turn8search3turn18search2
- App size guidance and Bitcode deprecation are based on Apple docs. citeturn11search0turn11search1
- SwiftUI identity/equatable guidance from Apple docs and community write‑ups. citeturn8search10turn17search4
