# SF Symbols Cheatsheet

Top 50 SF Symbols by category, rendering modes, variable values, and code snippets.

---

## Navigation

| Symbol | Name | Common Use |
|--------|------|------------|
| `chevron.left` | Back arrow | Navigation back button |
| `chevron.right` | Forward arrow | Disclosure indicator, next |
| `xmark` | Close | Dismiss sheets, modals |
| `xmark.circle.fill` | Close (filled) | Clear text field, dismiss |
| `house.fill` | Home | Tab bar home |
| `arrow.left` | Arrow back | Alternative back navigation |
| `line.3.horizontal` | Hamburger menu | Side menu toggle |
| `ellipsis` | More options | Overflow menu |
| `ellipsis.circle` | More (circled) | Toolbar more button |

---

## Status & Feedback

| Symbol | Name | Common Use |
|--------|------|------------|
| `checkmark` | Checkmark | Success, completion |
| `checkmark.circle.fill` | Checkmark (filled) | Selected state, done |
| `exclamationmark.triangle.fill` | Warning | Alerts, caution |
| `exclamationmark.circle.fill` | Error | Error states |
| `info.circle` | Info | Information tooltip |
| `bell.fill` | Notification | Notifications tab |
| `bell.badge` | Notification badge | Unread notifications |

---

## Media & Content

| Symbol | Name | Common Use |
|--------|------|------------|
| `photo` | Photo | Image placeholder |
| `camera.fill` | Camera | Take photo |
| `play.fill` | Play | Media playback |
| `pause.fill` | Pause | Media pause |
| `mic.fill` | Microphone | Voice input |
| `speaker.wave.2.fill` | Volume | Sound control |
| `music.note` | Music | Audio content |

---

## Social & People

| Symbol | Name | Common Use |
|--------|------|------------|
| `person.fill` | Person | Profile, account |
| `person.2.fill` | People | Groups, contacts |
| `person.crop.circle` | Avatar | Profile picture placeholder |
| `heart.fill` | Heart | Like, favorite |
| `hand.thumbsup.fill` | Thumbs up | Reaction |
| `bubble.left.fill` | Chat bubble | Messaging |
| `paperplane.fill` | Send | Send message |
| `square.and.arrow.up` | Share | Share sheet |

---

## Utility

| Symbol | Name | Common Use |
|--------|------|------------|
| `magnifyingglass` | Search | Search bar, find |
| `gearshape.fill` | Settings | Settings/preferences |
| `slider.horizontal.3` | Filters | Filter/sort controls |
| `plus` | Add | Create new item |
| `plus.circle.fill` | Add (filled) | Prominent add button |
| `trash.fill` | Delete | Delete action |
| `pencil` | Edit | Edit mode |
| `square.and.pencil` | Compose | New document/message |
| `doc.on.doc` | Copy | Copy to clipboard |
| `arrow.down.circle` | Download | Download action |
| `arrow.up.circle` | Upload | Upload action |
| `bookmark.fill` | Bookmark | Save for later |
| `star.fill` | Star | Rating, favorite |
| `flag.fill` | Flag | Report, flag content |
| `eye.fill` | Visibility | Show/hide toggle |
| `eye.slash.fill` | Hidden | Password hide |
| `lock.fill` | Lock | Security, locked state |
| `mappin` | Location | Map pin, location |
| `calendar` | Calendar | Date picker, events |
| `clock` | Clock | Time, recent |

---

## Rendering Modes

SF Symbols support 4 rendering modes that change how colors are applied:

### Monochrome (Default)
Single color applied to entire symbol.
```swift
Image(systemName: "heart.fill")
    .foregroundStyle(.red)
```

### Hierarchical
Single color with automatic opacity layers for depth.
```swift
Image(systemName: "speaker.wave.2.fill")
    .symbolRenderingMode(.hierarchical)
    .foregroundStyle(.blue)
```

### Palette
Explicit colors for each layer (primary, secondary, tertiary).
```swift
Image(systemName: "person.crop.circle.badge.checkmark")
    .symbolRenderingMode(.palette)
    .foregroundStyle(.blue, .green)
```

### Multicolor
System-defined colors (like Apple's native look).
```swift
Image(systemName: "externaldrive.badge.plus")
    .symbolRenderingMode(.multicolor)
```

---

## Variable Value (iOS 16+)

Symbols that represent levels (volume, signal, progress) can be driven by a 0.0-1.0 value:

```swift
// Volume indicator that fills based on level
Image(systemName: "speaker.wave.3.fill", variableValue: 0.7)
    .font(.title)

// Wi-Fi signal strength
Image(systemName: "wifi", variableValue: signalStrength)
    .symbolRenderingMode(.hierarchical)
    .foregroundStyle(.blue)
```

### Symbols Supporting Variable Value

| Symbol | What varies |
|--------|------------|
| `speaker.wave.3.fill` | Number of sound waves shown |
| `wifi` | Signal bar fill level |
| `chart.bar.fill` | Bar heights |
| `cellularbars` | Bar fill level |
| `slowmo` | Arc fill amount |
| `timelapse` | Arc fill amount |
| `touchid` | Ring segments highlighted |

---

## Symbol Effects (iOS 17+)

Animate symbols with built-in effects:

```swift
// Bounce on tap
Image(systemName: "heart.fill")
    .symbolEffect(.bounce, value: tapCount)

// Pulse continuously
Image(systemName: "bell.fill")
    .symbolEffect(.pulse)

// Variable color wave
Image(systemName: "wifi")
    .symbolEffect(.variableColor.iterative)

// Replace with transition
Image(systemName: isPlaying ? "pause.fill" : "play.fill")
    .contentTransition(.symbolEffect(.replace))

// Scale effect
Image(systemName: "star.fill")
    .symbolEffect(.scale.up, isActive: isHighlighted)

// Appear/disappear
Image(systemName: "checkmark")
    .symbolEffect(.appear, isActive: showCheck)
```

---

## Sizing Best Practices

```swift
// Preferred: use font size for consistent scaling with text
Image(systemName: "heart.fill")
    .font(.title2)

// Alternative: explicit image scale
Image(systemName: "heart.fill")
    .imageScale(.large)

// Match to specific point size with weight
Image(systemName: "heart.fill")
    .font(.system(size: 24, weight: .medium))

// In labels (auto-aligns symbol with text)
Label("Favorites", systemImage: "heart.fill")
    .font(.body)
```
