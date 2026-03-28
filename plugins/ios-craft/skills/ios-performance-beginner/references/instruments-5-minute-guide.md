# Instruments in 5 Minutes

A beginner-friendly walkthrough of the two instruments that solve 90% of performance issues: Time Profiler and Allocations.

## Opening Instruments

Three ways to get there:

1. **From Xcode:** Product → Profile (Cmd+I) — builds in Release mode and opens Instruments
2. **From Xcode menu:** Xcode → Open Developer Tool → Instruments
3. **Directly:** Open Instruments from Applications/Xcode.app → Contents → Applications

**Important:** Always profile in **Release mode** on a **physical device**. Debug builds have optimizations disabled and Simulator performance is not representative.

## Time Profiler

**What it tells you:** Which functions are using the most CPU time.

**When to use it:** App feels slow, scrolling janks, UI freezes, animations stutter.

### Step-by-Step

1. **Open Instruments** (Cmd+I from Xcode)
2. **Choose "Time Profiler"** from the template picker
3. **Select your device** in the top-left dropdown (not Simulator)
4. **Click the red Record button** (or Cmd+R)
5. **Use your app** — navigate to the slow part, reproduce the issue
6. **Click Stop** when done

### Reading the Results

You'll see a timeline at the top and a call tree at the bottom.

**The timeline** shows CPU usage over time. Spikes = heavy work.

**The call tree** shows where time was spent. Focus on:

1. **Click "Call Tree"** in the bottom-left (if not already selected)
2. **Check these boxes** in the bottom inspector:
   - ✅ Invert Call Tree — shows the "leaf" functions (where time was actually spent)
   - ✅ Hide System Libraries — shows only YOUR code
   - ✅ Separate by Thread — shows main thread vs background

3. **Look at the main thread** — anything > 16ms blocks a frame at 60fps

**What to look for:**

| Pattern | Meaning | Fix |
|---------|---------|-----|
| One function dominates | That function is your bottleneck | Optimize it or move to background |
| Many small calls add up | Death by a thousand cuts | Cache results, reduce frequency |
| Main thread doing I/O | File/network on main thread | Move to `Task.detached` or actor |
| SwiftUI body calls | Too many re-renders | Extract views, check identity |

### Quick Interpretation

```
Thread 1 (Main Thread)
  ├─ 45%  closure #1 in ContentView.body.getter    ← Body running too often
  │   ├─ 30%  Array.filter                         ← Filtering in body
  │   └─ 15%  Array.sorted                         ← Sorting in body
  ├─ 25%  ImageIO                                  ← Image decoding on main thread
  └─ 10%  CoreData.fetch                           ← Database query on main thread
```

**Action items from this example:**
1. Move filter/sort out of `body` into `onChange`
2. Downscale images or decode on background thread
3. Move Core Data fetch to a background context

## Allocations

**What it tells you:** How much memory your app uses and whether it's leaking.

**When to use it:** Memory keeps growing, app gets killed by the system, or you suspect a retain cycle.

### Step-by-Step

1. **Open Instruments** (Cmd+I)
2. **Choose "Allocations"** from the template picker
3. **Select your device**
4. **Click Record**
5. **Use your app** — navigate back and forth between screens, open and close features
6. **Click Stop**

### Reading the Results

**The graph** shows total memory over time.

**Healthy pattern:** Memory goes up when you open a screen, comes back down when you leave it.

**Leak pattern:** Memory goes up when you open a screen, stays high when you leave it. Repeat = memory keeps climbing.

### Finding Leaks

1. **Look at the graph** — if it's a staircase (only going up), you have a leak
2. **Use the "Mark Generation" button** (flag icon):
   - Navigate to a screen → click Mark Generation
   - Leave the screen → click Mark Generation again
   - The "Growth" column shows memory that wasn't freed
3. **Drill into the growth** — click the disclosure triangle to see which objects survived
4. **Common culprits:**
   - Closures capturing `self` strongly
   - Delegate references without `weak`
   - Timer references not invalidated
   - NotificationCenter observers not removed

### Quick Leak Detection Pattern

```
1. Go to Screen A → Mark Generation (baseline)
2. Go to Screen B → come back to Screen A → Mark Generation
3. Go to Screen B → come back to Screen A → Mark Generation
4. Go to Screen B → come back to Screen A → Mark Generation

Check: Does "Growth" between generations stay constant or increase?
  - Constant: Normal (some caching)
  - Increasing: Leak — Screen B isn't fully deallocating
```

### Common Memory Issues

| Pattern | Likely Cause | Fix |
|---------|-------------|-----|
| Staircase graph | Retain cycle or missing cleanup | Use `[weak self]` in closures, `weak` delegates |
| Spike then stable | Normal allocation | Not a problem |
| Gradual climb | Accumulated caches or unbounded arrays | Add cache limits, clear on memory warning |
| Sudden jump | Large image or data load | Downscale images, stream large data |

## Instruments Cheat Sheet

| I want to find... | Use this instrument |
|-------------------|-------------------|
| Why is the UI slow? | Time Profiler |
| Why is memory growing? | Allocations |
| Is there a retain cycle? | Allocations + Leaks |
| Why is scrolling janky? | Time Profiler (look at main thread during scroll) |
| Why is launch slow? | Time Profiler (record from launch) |
| Why is the app using so much energy? | Energy Log |
| Network performance? | Network (URLSession instrument) |

## Tips

- **Profile on the slowest device you support.** Performance that's fine on iPhone 16 Pro may be terrible on iPhone SE.
- **Profile in Release mode.** Debug builds are 2-10x slower due to disabled optimizations.
- **Don't over-optimize.** If Instruments shows a function taking 0.5ms, don't spend an hour making it 0.1ms.
- **Save traces.** File → Save (Cmd+S) to keep Instruments traces for comparison after optimization.
- **Use the filter bar.** Type your class or function name in the search bar at the bottom to narrow results.
