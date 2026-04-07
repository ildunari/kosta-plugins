# Case Study: Cold Start

**Symptoms**: app takes ~1.8s to become interactive on iPhone SE (2nd gen).  
**Method**: Launch metric + Points of Interest; Time Profiler. citeturn12search15turn12search4

**Findings**: synchronous JSON decode on main, heavy asset registration at `application(_:didFinishLaunching:)`.  
**Fix**: move decode off main with async init; defer non-essential registration post-first-frame.  
**Result**: 1.8s → 1.1s (≈39% faster) across 10 runs.
