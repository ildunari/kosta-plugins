# Spring Physics Visual Guide

SwiftUI springs are defined by two primary parameters:

- **`response`** — Duration (in seconds) for the spring to reach its target. Lower = faster.
- **`dampingFraction`** — How much oscillation occurs. `0` = infinite bounce, `1` = no bounce (critical damping), `>1` = overdamped (sluggish).

---

## Parameter Combos by Feel

### Snappy
Fast, decisive motion with minimal overshoot. Best for button taps, toggles, tab switches.

| Response | Damping | Code | Feel |
|----------|---------|------|------|
| 0.25 | 0.80 | `.spring(response: 0.25, dampingFraction: 0.80)` | Quick settle, almost no bounce |
| 0.30 | 0.75 | `.spring(response: 0.30, dampingFraction: 0.75)` | Snappy with a hint of life |
| 0.35 | 0.70 | `.spring(response: 0.35, dampingFraction: 0.70)` | Crisp tap response |
| 0.20 | 0.85 | `.spring(response: 0.20, dampingFraction: 0.85)` | Ultra-fast, surgical |

### Bouncy
Playful overshoot that draws attention. Best for success states, celebratory moments, playful UI.

| Response | Damping | Code | Feel |
|----------|---------|------|------|
| 0.40 | 0.50 | `.spring(response: 0.40, dampingFraction: 0.50)` | Noticeable bounce, fun |
| 0.50 | 0.45 | `.spring(response: 0.50, dampingFraction: 0.45)` | Cartoon-like bounce |
| 0.35 | 0.55 | `.spring(response: 0.35, dampingFraction: 0.55)` | Quick but bouncy |
| 0.60 | 0.40 | `.spring(response: 0.60, dampingFraction: 0.40)` | Exaggerated, attention-grabbing |

### Gentle
Slow, smooth motion that feels calm. Best for modals, sheets, large surface transitions.

| Response | Damping | Code | Feel |
|----------|---------|------|------|
| 0.60 | 0.80 | `.spring(response: 0.60, dampingFraction: 0.80)` | Smooth glide |
| 0.70 | 0.85 | `.spring(response: 0.70, dampingFraction: 0.85)` | Lazy, elegant float |
| 0.55 | 0.78 | `.spring(response: 0.55, dampingFraction: 0.78)` | Relaxed settle |
| 0.80 | 0.90 | `.spring(response: 0.80, dampingFraction: 0.90)` | Very slow, zen-like |

### Rigid
Minimal overshoot, firm deceleration. Best for toolbars, navigation bars, precision controls.

| Response | Damping | Code | Feel |
|----------|---------|------|------|
| 0.30 | 1.00 | `.spring(response: 0.30, dampingFraction: 1.00)` | Critically damped, no bounce |
| 0.35 | 0.95 | `.spring(response: 0.35, dampingFraction: 0.95)` | Almost no overshoot |
| 0.25 | 1.00 | `.spring(response: 0.25, dampingFraction: 1.00)` | Fast and firm |
| 0.40 | 1.10 | `.spring(response: 0.40, dampingFraction: 1.10)` | Overdamped, deliberate |

### Rubber Band
Elastic feel that suggests tension. Best for overscroll, pull-to-refresh, drag limits.

| Response | Damping | Code | Feel |
|----------|---------|------|------|
| 0.50 | 0.35 | `.spring(response: 0.50, dampingFraction: 0.35)` | Strong rubber snap |
| 0.60 | 0.30 | `.spring(response: 0.60, dampingFraction: 0.30)` | Wobbly, elastic |
| 0.45 | 0.40 | `.spring(response: 0.45, dampingFraction: 0.40)` | Tight rubber band |
| 0.55 | 0.25 | `.spring(response: 0.55, dampingFraction: 0.25)` | Very springy, lots of oscillation |

---

## Preset Springs (iOS 17+)

SwiftUI provides built-in presets:

| Preset | Equivalent | Best for |
|--------|-----------|----------|
| `.spring(.smooth)` | `response: 0.5, dampingFraction: 1.0` | General purpose, no bounce |
| `.spring(.snappy)` | `response: 0.35, dampingFraction: 0.86` | Buttons, toggles |
| `.spring(.bouncy)` | `response: 0.5, dampingFraction: 0.7` | Fun, playful interactions |
| `.spring(.smooth(duration: 0.3))` | Custom duration, critically damped | Quick, precise |
| `.spring(.bouncy(duration: 0.4))` | Custom duration, bouncy | Controlled playfulness |

---

## Tips

- **Default recommendation**: `response: 0.5, dampingFraction: 0.7` — versatile, feels natural, works for most UI.
- **Match Apple's feel**: Use the presets (`.smooth`, `.snappy`, `.bouncy`) — they're calibrated to match system animations.
- **Avoid `dampingFraction: 0`**: Infinite oscillation, never settles. Only useful for perpetual motion (spinning icons).
- **Avoid `response > 1.0`**: Feels sluggish and unresponsive. Keep under 0.8 for interactive elements.
- **Combine with `blendDuration`**: `.spring(response: 0.5, dampingFraction: 0.7, blendDuration: 0.1)` smoothly blends interrupted animations.
- **Interactive springs**: For gesture-driven animation, use lower response (0.2-0.3) so the UI keeps up with the finger.
