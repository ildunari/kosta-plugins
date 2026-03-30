# Tailwind CSS to SwiftUI Mapping

Comprehensive reference for converting Tailwind CSS utility classes to SwiftUI equivalents. Tailwind spacing unit = 4pt (e.g., `p-4` = 16pt padding).

---

## Layout

| Tailwind | SwiftUI |
|----------|---------|
| `flex flex-col` | `VStack` |
| `flex flex-row` | `HStack` |
| `flex flex-wrap` | `LazyVGrid(columns: [GridItem(.adaptive(minimum: N))])` |
| `grid grid-cols-2` | `LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())])` |
| `grid grid-cols-3` | `LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3))` |
| `grid grid-cols-4` | `LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4))` |
| `block` | `VStack` (default block flow) |
| `inline` | `HStack` child (inline flow) |
| `hidden` | `EmptyView()` or conditionally omit |
| `overflow-scroll` | `ScrollView` |
| `overflow-x-scroll` | `ScrollView(.horizontal)` |
| `overflow-y-scroll` | `ScrollView(.vertical)` |
| `overflow-hidden` | `.clipped()` |
| `relative` / `absolute` | `ZStack` with `.offset(x:y:)` |
| `fixed` | `.overlay()` or `ZStack` at root level |
| `sticky` | Pinned header in `LazyVStack(pinnedViews: [.sectionHeaders])` |
| `z-10` / `z-20` / `z-50` | `ZStack` ordering (later children render on top) or `.zIndex(N)` |

### Flexbox Alignment

| Tailwind | SwiftUI |
|----------|---------|
| `items-start` | `VStack(alignment: .leading)` or `HStack { ... Spacer() }` |
| `items-center` | `VStack(alignment: .center)` or `HStack` (default) |
| `items-end` | `VStack(alignment: .trailing)` or `HStack { Spacer() ... }` |
| `items-stretch` | `.frame(maxWidth: .infinity)` on children |
| `justify-start` | `VStack { ... Spacer() }` |
| `justify-center` | `VStack { Spacer() ... Spacer() }` |
| `justify-end` | `VStack { Spacer() ... }` |
| `justify-between` | `Spacer()` between each child |
| `justify-around` | `Spacer()` around and between children (equal) |
| `justify-evenly` | `Spacer()` around and between children (equal) |
| `self-start` | `.frame(maxWidth: .infinity, alignment: .leading)` |
| `self-center` | `.frame(maxWidth: .infinity, alignment: .center)` |
| `self-end` | `.frame(maxWidth: .infinity, alignment: .trailing)` |
| `flex-1` | `.frame(maxWidth: .infinity)` or `.frame(maxHeight: .infinity)` |
| `flex-grow` | `Spacer()` or `.frame(max...: .infinity)` |
| `flex-shrink-0` | `.fixedSize()` |
| `order-first` | Move view first in parent |
| `order-last` | Move view last in parent |

---

## Spacing

Tailwind uses a 4pt base unit. Multiply the Tailwind value by 4 to get points.

### Padding

| Tailwind | SwiftUI |
|----------|---------|
| `p-0` | `.padding(0)` |
| `p-0.5` | `.padding(2)` |
| `p-1` | `.padding(4)` |
| `p-1.5` | `.padding(6)` |
| `p-2` | `.padding(8)` |
| `p-2.5` | `.padding(10)` |
| `p-3` | `.padding(12)` |
| `p-3.5` | `.padding(14)` |
| `p-4` | `.padding(16)` |
| `p-5` | `.padding(20)` |
| `p-6` | `.padding(24)` |
| `p-7` | `.padding(28)` |
| `p-8` | `.padding(32)` |
| `p-9` | `.padding(36)` |
| `p-10` | `.padding(40)` |
| `p-11` | `.padding(44)` |
| `p-12` | `.padding(48)` |
| `p-14` | `.padding(56)` |
| `p-16` | `.padding(64)` |
| `p-20` | `.padding(80)` |
| `px-N` | `.padding(.horizontal, N*4)` |
| `py-N` | `.padding(.vertical, N*4)` |
| `pt-N` | `.padding(.top, N*4)` |
| `pb-N` | `.padding(.bottom, N*4)` |
| `pl-N` / `ps-N` | `.padding(.leading, N*4)` |
| `pr-N` / `pe-N` | `.padding(.trailing, N*4)` |

### Margin & Gap

| Tailwind | SwiftUI |
|----------|---------|
| `m-N` | `Spacer()` or `spacing:` parameter on parent stack |
| `mx-auto` | `.frame(maxWidth: .infinity)` (centers content) |
| `mt-N` | `.padding(.top, N*4)` on element or `Spacer().frame(height: N*4)` above |
| `mb-N` | `.padding(.bottom, N*4)` on element or `Spacer().frame(height: N*4)` below |
| `gap-N` | `VStack(spacing: N*4)` or `HStack(spacing: N*4)` |
| `gap-x-N` | `HStack(spacing: N*4)` |
| `gap-y-N` | `VStack(spacing: N*4)` |
| `space-x-N` | `HStack(spacing: N*4)` |
| `space-y-N` | `VStack(spacing: N*4)` |

---

## Typography

### Font Size

| Tailwind | SwiftUI | Approx Size |
|----------|---------|-------------|
| `text-xs` | `.font(.caption2)` | 11pt |
| `text-sm` | `.font(.caption)` | 12pt |
| `text-base` | `.font(.body)` | 17pt |
| `text-lg` | `.font(.title3)` | 20pt |
| `text-xl` | `.font(.title2)` | 22pt |
| `text-2xl` | `.font(.title)` | 28pt |
| `text-3xl` | `.font(.largeTitle)` | 34pt |
| `text-4xl` | `.font(.system(size: 36))` | 36pt |
| `text-5xl` | `.font(.system(size: 48))` | 48pt |
| `text-6xl` | `.font(.system(size: 60))` | 60pt |
| `text-7xl` | `.font(.system(size: 72))` | 72pt |
| `text-8xl` | `.font(.system(size: 96))` | 96pt |
| `text-9xl` | `.font(.system(size: 128))` | 128pt |

### Font Weight

| Tailwind | SwiftUI |
|----------|---------|
| `font-thin` | `.fontWeight(.thin)` |
| `font-extralight` | `.fontWeight(.ultraLight)` |
| `font-light` | `.fontWeight(.light)` |
| `font-normal` | `.fontWeight(.regular)` |
| `font-medium` | `.fontWeight(.medium)` |
| `font-semibold` | `.fontWeight(.semibold)` |
| `font-bold` | `.fontWeight(.bold)` |
| `font-extrabold` | `.fontWeight(.heavy)` |
| `font-black` | `.fontWeight(.black)` |

### Font Style & Decoration

| Tailwind | SwiftUI |
|----------|---------|
| `italic` | `.italic()` |
| `not-italic` | (default, no modifier needed) |
| `underline` | `.underline()` |
| `line-through` | `.strikethrough()` |
| `no-underline` | (default) |
| `uppercase` | `.textCase(.uppercase)` |
| `lowercase` | `.textCase(.lowercase)` |
| `capitalize` | `.textCase(nil)` + manual capitalization |
| `normal-case` | `.textCase(nil)` |

### Text Alignment

| Tailwind | SwiftUI |
|----------|---------|
| `text-left` | `.multilineTextAlignment(.leading)` |
| `text-center` | `.multilineTextAlignment(.center)` |
| `text-right` | `.multilineTextAlignment(.trailing)` |

### Text Spacing

| Tailwind | SwiftUI |
|----------|---------|
| `tracking-tighter` | `.tracking(-0.8)` |
| `tracking-tight` | `.tracking(-0.4)` |
| `tracking-normal` | `.tracking(0)` |
| `tracking-wide` | `.tracking(0.4)` |
| `tracking-wider` | `.tracking(0.8)` |
| `tracking-widest` | `.tracking(1.6)` |
| `leading-none` | `.lineSpacing(0)` |
| `leading-tight` | `.lineSpacing(2)` |
| `leading-snug` | `.lineSpacing(4)` |
| `leading-normal` | `.lineSpacing(6)` |
| `leading-relaxed` | `.lineSpacing(8)` |
| `leading-loose` | `.lineSpacing(12)` |

### Text Overflow

| Tailwind | SwiftUI |
|----------|---------|
| `truncate` | `.lineLimit(1).truncationMode(.tail)` |
| `text-ellipsis` | `.truncationMode(.tail)` |
| `text-clip` | `.truncationMode(.head)` (closest equivalent) |
| `line-clamp-2` | `.lineLimit(2)` |
| `line-clamp-3` | `.lineLimit(3)` |
| `line-clamp-N` | `.lineLimit(N)` |

---

## Colors

### Color Application

| Tailwind Pattern | SwiftUI |
|------------------|---------|
| `text-{color}-{shade}` | `.foregroundStyle(Color(hex: "..."))` or design token |
| `bg-{color}-{shade}` | `.background(Color(hex: "..."))` |
| `border-{color}-{shade}` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color(hex: "...")))` |
| `ring-{color}-{shade}` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color(hex: "..."), lineWidth: 2))` |
| `opacity-N` | `.opacity(Double(N) / 100.0)` |
| `text-white` | `.foregroundStyle(.white)` |
| `text-black` | `.foregroundStyle(.black)` |
| `bg-white` | `.background(.white)` |
| `bg-black` | `.background(.black)` |
| `bg-transparent` | `.background(.clear)` |

### Tailwind Color Palette (Hex Values)

#### Slate
| Shade | Hex |
|-------|-----|
| 50 | `#f8fafc` |
| 100 | `#f1f5f9` |
| 200 | `#e2e8f0` |
| 300 | `#cbd5e1` |
| 400 | `#94a3b8` |
| 500 | `#64748b` |
| 600 | `#475569` |
| 700 | `#334155` |
| 800 | `#1e293b` |
| 900 | `#0f172a` |
| 950 | `#020617` |

#### Gray
| Shade | Hex |
|-------|-----|
| 50 | `#f9fafb` |
| 100 | `#f3f4f6` |
| 200 | `#e5e7eb` |
| 300 | `#d1d5db` |
| 400 | `#9ca3af` |
| 500 | `#6b7280` |
| 600 | `#4b5563` |
| 700 | `#374151` |
| 800 | `#1f2937` |
| 900 | `#111827` |
| 950 | `#030712` |

#### Zinc
| Shade | Hex |
|-------|-----|
| 50 | `#fafafa` |
| 100 | `#f4f4f5` |
| 200 | `#e4e4e7` |
| 300 | `#d4d4d8` |
| 400 | `#a1a1aa` |
| 500 | `#71717a` |
| 600 | `#52525b` |
| 700 | `#3f3f46` |
| 800 | `#27272a` |
| 900 | `#18181b` |
| 950 | `#09090b` |

#### Neutral
| Shade | Hex |
|-------|-----|
| 50 | `#fafafa` |
| 100 | `#f5f5f5` |
| 200 | `#e5e5e5` |
| 300 | `#d4d4d4` |
| 400 | `#a3a3a3` |
| 500 | `#737373` |
| 600 | `#525252` |
| 700 | `#404040` |
| 800 | `#262626` |
| 900 | `#171717` |
| 950 | `#0a0a0a` |

#### Stone
| Shade | Hex |
|-------|-----|
| 50 | `#fafaf9` |
| 100 | `#f5f5f4` |
| 200 | `#e7e5e4` |
| 300 | `#d6d3d1` |
| 400 | `#a8a29e` |
| 500 | `#78716c` |
| 600 | `#57534e` |
| 700 | `#44403c` |
| 800 | `#292524` |
| 900 | `#1c1917` |
| 950 | `#0c0a09` |

#### Red
| Shade | Hex |
|-------|-----|
| 50 | `#fef2f2` |
| 100 | `#fee2e2` |
| 200 | `#fecaca` |
| 300 | `#fca5a5` |
| 400 | `#f87171` |
| 500 | `#ef4444` |
| 600 | `#dc2626` |
| 700 | `#b91c1c` |
| 800 | `#991b1b` |
| 900 | `#7f1d1d` |
| 950 | `#450a0a` |

#### Blue
| Shade | Hex |
|-------|-----|
| 50 | `#eff6ff` |
| 100 | `#dbeafe` |
| 200 | `#bfdbfe` |
| 300 | `#93c5fd` |
| 400 | `#60a5fa` |
| 500 | `#3b82f6` |
| 600 | `#2563eb` |
| 700 | `#1d4ed8` |
| 800 | `#1e40af` |
| 900 | `#1e3a8a` |
| 950 | `#172554` |

#### Green
| Shade | Hex |
|-------|-----|
| 50 | `#f0fdf4` |
| 100 | `#dcfce7` |
| 200 | `#bbf7d0` |
| 300 | `#86efac` |
| 400 | `#4ade80` |
| 500 | `#22c55e` |
| 600 | `#16a34a` |
| 700 | `#15803d` |
| 800 | `#166534` |
| 900 | `#14532d` |
| 950 | `#052e16` |

#### Yellow
| Shade | Hex |
|-------|-----|
| 50 | `#fefce8` |
| 100 | `#fef9c3` |
| 200 | `#fef08a` |
| 300 | `#fde047` |
| 400 | `#facc15` |
| 500 | `#eab308` |
| 600 | `#ca8a04` |
| 700 | `#a16207` |
| 800 | `#854d0e` |
| 900 | `#713f12` |
| 950 | `#422006` |

#### Purple
| Shade | Hex |
|-------|-----|
| 50 | `#faf5ff` |
| 100 | `#f3e8ff` |
| 200 | `#e9d5ff` |
| 300 | `#d8b4fe` |
| 400 | `#c084fc` |
| 500 | `#a855f7` |
| 600 | `#9333ea` |
| 700 | `#7e22ce` |
| 800 | `#6b21a8` |
| 900 | `#581c87` |
| 950 | `#3b0764` |

---

## Sizing

### Width

| Tailwind | SwiftUI |
|----------|---------|
| `w-0` | `.frame(width: 0)` |
| `w-px` | `.frame(width: 1)` |
| `w-N` | `.frame(width: N * 4)` |
| `w-full` | `.frame(maxWidth: .infinity)` |
| `w-screen` | `GeometryReader { geo in ... .frame(width: geo.size.width) }` |
| `w-auto` | (default, no frame needed) |
| `w-fit` | `.fixedSize(horizontal: true, vertical: false)` |
| `w-min` | `.fixedSize(horizontal: true, vertical: false)` |
| `w-max` | `.frame(maxWidth: .infinity)` |
| `w-1/2` | `.frame(width: geo.size.width * 0.5)` (inside GeometryReader) |
| `w-1/3` | `.frame(width: geo.size.width / 3)` |
| `w-2/3` | `.frame(width: geo.size.width * 2 / 3)` |

### Height

| Tailwind | SwiftUI |
|----------|---------|
| `h-0` | `.frame(height: 0)` |
| `h-px` | `.frame(height: 1)` |
| `h-N` | `.frame(height: N * 4)` |
| `h-full` | `.frame(maxHeight: .infinity)` |
| `h-screen` | `GeometryReader { geo in ... .frame(height: geo.size.height) }` |
| `h-auto` | (default) |
| `h-fit` | `.fixedSize(horizontal: false, vertical: true)` |

### Min/Max Sizing

| Tailwind | SwiftUI |
|----------|---------|
| `min-w-0` | `.frame(minWidth: 0)` |
| `min-w-full` | `.frame(minWidth: .infinity)` (use maxWidth instead) |
| `min-h-0` | `.frame(minHeight: 0)` |
| `min-h-screen` | `.frame(minHeight: UIScreen.main.bounds.height)` |
| `max-w-xs` | `.frame(maxWidth: 320)` |
| `max-w-sm` | `.frame(maxWidth: 384)` |
| `max-w-md` | `.frame(maxWidth: 448)` |
| `max-w-lg` | `.frame(maxWidth: 512)` |
| `max-w-xl` | `.frame(maxWidth: 576)` |
| `max-w-2xl` | `.frame(maxWidth: 672)` |
| `max-w-3xl` | `.frame(maxWidth: 768)` |
| `max-w-4xl` | `.frame(maxWidth: 896)` |
| `max-w-5xl` | `.frame(maxWidth: 1024)` |
| `max-w-6xl` | `.frame(maxWidth: 1152)` |
| `max-w-7xl` | `.frame(maxWidth: 1280)` |
| `max-w-full` | `.frame(maxWidth: .infinity)` |
| `max-w-prose` | `.frame(maxWidth: 640)` |
| `max-w-screen-sm` | `.frame(maxWidth: 640)` |
| `max-w-screen-md` | `.frame(maxWidth: 768)` |
| `max-w-screen-lg` | `.frame(maxWidth: 1024)` |
| `max-w-screen-xl` | `.frame(maxWidth: 1280)` |

### Aspect Ratio

| Tailwind | SwiftUI |
|----------|---------|
| `aspect-square` | `.aspectRatio(1, contentMode: .fit)` |
| `aspect-video` | `.aspectRatio(16.0/9.0, contentMode: .fit)` |
| `aspect-auto` | (default, no modifier) |

---

## Borders & Shapes

### Border Radius

| Tailwind | SwiftUI |
|----------|---------|
| `rounded-none` | `.clipShape(RoundedRectangle(cornerRadius: 0))` |
| `rounded-sm` | `.clipShape(RoundedRectangle(cornerRadius: 2))` |
| `rounded` | `.clipShape(RoundedRectangle(cornerRadius: 4))` |
| `rounded-md` | `.clipShape(RoundedRectangle(cornerRadius: 6))` |
| `rounded-lg` | `.clipShape(RoundedRectangle(cornerRadius: 8))` |
| `rounded-xl` | `.clipShape(RoundedRectangle(cornerRadius: 12))` |
| `rounded-2xl` | `.clipShape(RoundedRectangle(cornerRadius: 16))` |
| `rounded-3xl` | `.clipShape(RoundedRectangle(cornerRadius: 24))` |
| `rounded-full` | `.clipShape(Circle())` for square elements, `.clipShape(Capsule())` for rectangular |
| `rounded-t-lg` | `.clipShape(.rect(topLeadingRadius: 8, topTrailingRadius: 8))` |
| `rounded-b-lg` | `.clipShape(.rect(bottomLeadingRadius: 8, bottomTrailingRadius: 8))` |
| `rounded-l-lg` | `.clipShape(.rect(topLeadingRadius: 8, bottomLeadingRadius: 8))` |
| `rounded-r-lg` | `.clipShape(.rect(topTrailingRadius: 8, bottomTrailingRadius: 8))` |

### Borders

| Tailwind | SwiftUI |
|----------|---------|
| `border` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.gray, lineWidth: 1))` |
| `border-0` | (no border) |
| `border-2` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.gray, lineWidth: 2))` |
| `border-4` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.gray, lineWidth: 4))` |
| `border-8` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.gray, lineWidth: 8))` |
| `border-t` | `.overlay(alignment: .top) { Divider() }` |
| `border-b` | `.overlay(alignment: .bottom) { Divider() }` |
| `border-l` | `.overlay(alignment: .leading) { Rectangle().frame(width: 1).foregroundStyle(Color.gray) }` |
| `border-r` | `.overlay(alignment: .trailing) { Rectangle().frame(width: 1).foregroundStyle(Color.gray) }` |
| `border-dashed` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(style: StrokeStyle(lineWidth: 1, dash: [5])))` |
| `divide-y` | `ForEach` with `Divider()` between items |
| `divide-x` | Vertical `Divider()` between HStack children |

### Ring (Focus Ring / Outline)

| Tailwind | SwiftUI |
|----------|---------|
| `ring-1` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.blue, lineWidth: 1))` |
| `ring-2` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.blue, lineWidth: 2))` |
| `ring-4` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.blue, lineWidth: 4))` |
| `ring-offset-2` | `.padding(2)` before the ring overlay |

---

## Effects

### Shadows

| Tailwind | SwiftUI |
|----------|---------|
| `shadow-sm` | `.shadow(color: .black.opacity(0.05), radius: 1, x: 0, y: 1)` |
| `shadow` | `.shadow(color: .black.opacity(0.1), radius: 3, x: 0, y: 1)` |
| `shadow-md` | `.shadow(color: .black.opacity(0.1), radius: 6, x: 0, y: 4)` |
| `shadow-lg` | `.shadow(color: .black.opacity(0.1), radius: 15, x: 0, y: 8)` |
| `shadow-xl` | `.shadow(color: .black.opacity(0.1), radius: 25, x: 0, y: 20)` |
| `shadow-2xl` | `.shadow(color: .black.opacity(0.25), radius: 50, x: 0, y: 25)` |
| `shadow-inner` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.black.opacity(0.06), lineWidth: 1).blur(radius: 2).padding(-1))` |
| `shadow-none` | `.shadow(radius: 0)` |

### Blur & Backdrop

| Tailwind | SwiftUI |
|----------|---------|
| `blur-none` | `.blur(radius: 0)` |
| `blur-sm` | `.blur(radius: 4)` |
| `blur` | `.blur(radius: 8)` |
| `blur-md` | `.blur(radius: 12)` |
| `blur-lg` | `.blur(radius: 16)` |
| `blur-xl` | `.blur(radius: 24)` |
| `blur-2xl` | `.blur(radius: 40)` |
| `blur-3xl` | `.blur(radius: 64)` |
| `backdrop-blur-sm` | `.background(.ultraThinMaterial)` |
| `backdrop-blur` | `.background(.thinMaterial)` |
| `backdrop-blur-md` | `.background(.regularMaterial)` |
| `backdrop-blur-lg` | `.background(.thickMaterial)` |
| `backdrop-blur-xl` | `.background(.ultraThickMaterial)` |

### Opacity

| Tailwind | SwiftUI |
|----------|---------|
| `opacity-0` | `.opacity(0)` |
| `opacity-5` | `.opacity(0.05)` |
| `opacity-10` | `.opacity(0.1)` |
| `opacity-20` | `.opacity(0.2)` |
| `opacity-25` | `.opacity(0.25)` |
| `opacity-30` | `.opacity(0.3)` |
| `opacity-40` | `.opacity(0.4)` |
| `opacity-50` | `.opacity(0.5)` |
| `opacity-60` | `.opacity(0.6)` |
| `opacity-70` | `.opacity(0.7)` |
| `opacity-75` | `.opacity(0.75)` |
| `opacity-80` | `.opacity(0.8)` |
| `opacity-90` | `.opacity(0.9)` |
| `opacity-95` | `.opacity(0.95)` |
| `opacity-100` | `.opacity(1)` |

### Gradients

| Tailwind | SwiftUI |
|----------|---------|
| `bg-gradient-to-r from-{c1} to-{c2}` | `LinearGradient(colors: [c1, c2], startPoint: .leading, endPoint: .trailing)` |
| `bg-gradient-to-b from-{c1} to-{c2}` | `LinearGradient(colors: [c1, c2], startPoint: .top, endPoint: .bottom)` |
| `bg-gradient-to-br from-{c1} to-{c2}` | `LinearGradient(colors: [c1, c2], startPoint: .topLeading, endPoint: .bottomTrailing)` |
| `bg-gradient-to-t from-{c1} to-{c2}` | `LinearGradient(colors: [c1, c2], startPoint: .bottom, endPoint: .top)` |
| `bg-gradient-to-l from-{c1} to-{c2}` | `LinearGradient(colors: [c1, c2], startPoint: .trailing, endPoint: .leading)` |
| `via-{color}` | Add middle color to `colors:` array |

---

## Interactive Elements

| HTML / Tailwind | SwiftUI |
|-----------------|---------|
| `<button>` | `Button { action } label: { content }` |
| `<a href>` | `Link("text", destination: URL(...))` or `NavigationLink` for in-app |
| `<input type="text">` | `TextField("placeholder", text: $binding)` |
| `<input type="password">` | `SecureField("placeholder", text: $binding)` |
| `<textarea>` | `TextEditor(text: $binding)` |
| `<select>` | `Picker("label", selection: $binding) { ... }` or `Menu` |
| `<input type="checkbox">` | `Toggle(isOn: $binding)` |
| `<input type="radio">` | `Picker` with `.pickerStyle(.segmented)` or custom radio |
| `<input type="range">` | `Slider(value: $binding, in: range)` |
| `<input type="number">` | `TextField("", value: $binding, format: .number)` |
| `<input type="search">` | `TextField("Search", text: $binding)` with `.searchable()` on parent |
| `<input type="date">` | `DatePicker("label", selection: $binding)` |
| `<img src>` (remote) | `AsyncImage(url: URL(string: "..."))` |
| `<img src>` (local) | `Image("name")` or `Image(systemName: "sf.symbol")` |
| `<svg>` | `Image(systemName: "...")` or custom `Shape` |
| `<progress>` | `ProgressView(value: progress, total: 1.0)` |
| `<details>/<summary>` | `DisclosureGroup("title") { content }` |
| `<dialog>` | `.sheet()` or `.alert()` |
| `<nav>` | `NavigationStack` or `TabView` |
| `<ul>/<ol>` | `ForEach` inside `VStack` or `List` |
| `<table>` | `Grid` or `LazyVGrid` |

### Button Variants (Common Patterns)

| Tailwind Pattern | SwiftUI |
|------------------|---------|
| Primary button (`bg-blue-600 text-white rounded-lg px-4 py-2`) | `Button { } label: { Text("...").padding(.horizontal, 16).padding(.vertical, 8) }.buttonStyle(.borderedProminent)` |
| Secondary button (`border border-gray-300 rounded-lg`) | `Button { } label: { }.buttonStyle(.bordered)` |
| Ghost button (`hover:bg-gray-100`) | `Button { } label: { }.buttonStyle(.plain)` |
| Icon button (`p-2 rounded-full`) | `Button { } label: { Image(systemName: "...") }` |
| Destructive (`bg-red-600 text-white`) | `Button(role: .destructive) { } label: { }` |
| Disabled (`opacity-50 cursor-not-allowed`) | `.disabled(true)` |

---

## Transitions & Animation

| Tailwind | SwiftUI |
|----------|---------|
| `transition-all` | `.animation(.default, value: trigger)` |
| `transition-opacity` | `.animation(.easeInOut, value: opacity)` |
| `duration-150` | `.animation(.easeInOut(duration: 0.15), value: trigger)` |
| `duration-200` | `.animation(.easeInOut(duration: 0.2), value: trigger)` |
| `duration-300` | `.animation(.easeInOut(duration: 0.3), value: trigger)` |
| `duration-500` | `.animation(.easeInOut(duration: 0.5), value: trigger)` |
| `ease-in` | `.animation(.easeIn, value: trigger)` |
| `ease-out` | `.animation(.easeOut, value: trigger)` |
| `ease-in-out` | `.animation(.easeInOut, value: trigger)` |
| `animate-spin` | `.rotationEffect(.degrees(angle))` with repeating animation |
| `animate-ping` | `.scaleEffect(scale).opacity(opacity)` with repeating animation |
| `animate-pulse` | `.opacity(opacity)` with `.animation(.easeInOut.repeatForever())` |
| `animate-bounce` | `.offset(y: offset)` with `.animation(.interpolatingSpring.repeatForever())` |

---

## Responsive & Conditional

Tailwind breakpoints don't map directly to SwiftUI. Use these patterns:

| Tailwind | SwiftUI |
|----------|---------|
| `sm:` (640px+) | `@Environment(\.horizontalSizeClass) var sizeClass` -- `.compact` |
| `md:` (768px+) | Check `sizeClass == .regular` |
| `lg:` (1024px+) | `GeometryReader` width check or `UIDevice.current.userInterfaceIdiom == .pad` |
| `xl:` (1280px+) | iPad landscape check via GeometryReader |
| `dark:` | `@Environment(\.colorScheme) var colorScheme` -- `colorScheme == .dark` |
| `hover:` | `.hoverEffect()` (iPadOS pointer) or no direct equivalent on iOS |
| `focus:` | `@FocusState var isFocused` |
| `active:` | Button press state (use `.buttonStyle` with `isPressed`) |
| `disabled:` | `.disabled(condition)` modifier |
| `first:` / `last:` | Check index in `ForEach` enumeration |
| `group-hover:` | No direct equivalent; use parent state binding |
