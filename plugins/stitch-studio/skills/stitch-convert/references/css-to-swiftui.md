# CSS to SwiftUI Mapping

Reference for converting raw CSS properties (non-Tailwind) to SwiftUI equivalents. For Tailwind utility classes, use `tailwind-to-swiftui.md` instead.

---

## Layout & Display

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `display: flex; flex-direction: column` | `VStack` | Default alignment is `.center` |
| `display: flex; flex-direction: row` | `HStack` | Default alignment is `.center` |
| `display: flex; flex-wrap: wrap` | `LazyVGrid(columns: [GridItem(.adaptive(minimum: N))])` | Adaptive grid simulates flex-wrap |
| `display: grid; grid-template-columns: repeat(N, 1fr)` | `LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: N))` | |
| `display: block` | `VStack` (default flow) | Block elements stack vertically |
| `display: inline` | Child inside `HStack` | Inline elements flow horizontally |
| `display: none` | `EmptyView()` or conditional omission | Use `if condition { view }` |
| `display: inline-flex` | `HStack` | Same as flex-row in SwiftUI |

## Flexbox Properties

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `justify-content: flex-start` | `VStack { content; Spacer() }` | Push content to start |
| `justify-content: center` | `VStack { Spacer(); content; Spacer() }` | Center with spacers |
| `justify-content: flex-end` | `VStack { Spacer(); content }` | Push content to end |
| `justify-content: space-between` | Insert `Spacer()` between children | |
| `justify-content: space-around` | `Spacer()` around and between children | Approximate |
| `align-items: flex-start` | `HStack(alignment: .top)` or `VStack(alignment: .leading)` | Depends on flex direction |
| `align-items: center` | `HStack(alignment: .center)` | Default for HStack |
| `align-items: flex-end` | `HStack(alignment: .bottom)` or `VStack(alignment: .trailing)` | |
| `align-items: stretch` | `.frame(maxWidth: .infinity)` on children | |
| `flex: 1` | `.frame(maxWidth: .infinity)` or `.frame(maxHeight: .infinity)` | Depends on axis |
| `flex-grow: 1` | `Spacer()` or `.frame(max...: .infinity)` | |
| `flex-shrink: 0` | `.fixedSize()` | Prevents view from shrinking |
| `gap: 16px` | `VStack(spacing: 16)` or `HStack(spacing: 16)` | |

## Position

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `position: relative` | Default (all SwiftUI views are relatively positioned) | |
| `position: absolute` | `ZStack` with `.offset(x: N, y: N)` | Or use `GeometryReader` for precise placement |
| `position: fixed` | `.overlay()` or `ZStack` at the root of the view hierarchy | |
| `position: sticky` | `LazyVStack(pinnedViews: [.sectionHeaders]) { Section(header: ...) { } }` | |
| `top: N; left: N` | `.offset(x: N, y: N)` | Inside a ZStack |
| `inset: 0` | `.frame(maxWidth: .infinity, maxHeight: .infinity)` | Fills parent |

## Sizing

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `width: 200px` | `.frame(width: 200)` | |
| `height: 100px` | `.frame(height: 100)` | |
| `width: 100%` | `.frame(maxWidth: .infinity)` | |
| `height: 100%` | `.frame(maxHeight: .infinity)` | |
| `width: 50%` | `.frame(width: geo.size.width * 0.5)` | Requires `GeometryReader` |
| `max-width: 600px` | `.frame(maxWidth: 600)` | |
| `min-width: 200px` | `.frame(minWidth: 200)` | |
| `min-height: 44px` | `.frame(minHeight: 44)` | 44pt is iOS tap target minimum |
| `width: auto` | (default, no frame needed) | Views size to content by default |
| `height: fit-content` | `.fixedSize(horizontal: false, vertical: true)` | |
| `width: calc(100% - 32px)` | `.padding(.horizontal, 16)` on parent or `.frame(maxWidth: .infinity).padding(.horizontal, 16)` | Padding is usually the idiomatic approach |
| `aspect-ratio: 16/9` | `.aspectRatio(16.0/9.0, contentMode: .fit)` | |
| `aspect-ratio: 1` | `.aspectRatio(1, contentMode: .fit)` | |

## Spacing

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `padding: 16px` | `.padding(16)` | |
| `padding: 8px 16px` | `.padding(.vertical, 8).padding(.horizontal, 16)` | |
| `padding: 8px 16px 12px 16px` | `.padding(.top, 8).padding(.horizontal, 16).padding(.bottom, 12)` | |
| `padding-top: 16px` | `.padding(.top, 16)` | |
| `padding-left: 16px` | `.padding(.leading, 16)` | Use `.leading` not `.left` |
| `padding-right: 16px` | `.padding(.trailing, 16)` | Use `.trailing` not `.right` |
| `margin: 16px` | `Spacer().frame(height: 16)` or parent stack `spacing:` | SwiftUI has no margin; use padding on parent or spacers |
| `margin: 0 auto` | `.frame(maxWidth: .infinity)` | Centers horizontally |
| `margin-top: 24px` | `.padding(.top, 24)` or `Spacer().frame(height: 24)` above | |
| `margin-bottom: 24px` | `.padding(.bottom, 24)` or `Spacer().frame(height: 24)` below | |

## Colors & Backgrounds

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `color: #333` | `.foregroundStyle(Color(hex: "333333"))` | Requires Color+hex extension |
| `color: rgb(51, 51, 51)` | `.foregroundStyle(Color(red: 51/255, green: 51/255, blue: 51/255))` | |
| `color: rgba(0,0,0,0.5)` | `.foregroundStyle(Color.black.opacity(0.5))` | |
| `background-color: #f5f5f5` | `.background(Color(hex: "f5f5f5"))` | |
| `background: linear-gradient(to right, #c1, #c2)` | `.background(LinearGradient(colors: [c1, c2], startPoint: .leading, endPoint: .trailing))` | |
| `background: linear-gradient(135deg, #c1, #c2)` | `.background(LinearGradient(colors: [c1, c2], startPoint: .topLeading, endPoint: .bottomTrailing))` | |
| `background: radial-gradient(circle, #c1, #c2)` | `.background(RadialGradient(colors: [c1, c2], center: .center, startRadius: 0, endRadius: 200))` | |
| `background-image: url(...)` | `AsyncImage(url:)` as background or `Image` | |
| `background-size: cover` | `.scaledToFill()` | |
| `background-size: contain` | `.scaledToFit()` | |

## Typography

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `font-size: 17px` | `.font(.body)` or `.font(.system(size: 17))` | Prefer semantic sizes |
| `font-size: 12px` | `.font(.caption)` | |
| `font-size: 28px` | `.font(.title)` | |
| `font-size: 34px` | `.font(.largeTitle)` | |
| `font-weight: 400` | `.fontWeight(.regular)` | |
| `font-weight: 500` | `.fontWeight(.medium)` | |
| `font-weight: 600` | `.fontWeight(.semibold)` | |
| `font-weight: 700` | `.fontWeight(.bold)` | |
| `font-weight: bold` | `.fontWeight(.bold)` | |
| `font-family: system-ui, sans-serif` | `.font(.system(.body))` | Default system font |
| `font-family: 'SF Mono', monospace` | `.font(.system(.body, design: .monospaced))` | |
| `font-family: 'New York', serif` | `.font(.system(.body, design: .serif))` | |
| `font-family: 'SF Rounded'` | `.font(.system(.body, design: .rounded))` | |
| `font-style: italic` | `.italic()` | |
| `line-height: 1.5` | `.lineSpacing(font_size * 0.5)` | Approximate -- SwiftUI lineSpacing is additive |
| `letter-spacing: 1px` | `.tracking(1)` | |
| `text-decoration: underline` | `.underline()` | |
| `text-decoration: line-through` | `.strikethrough()` | |
| `text-align: center` | `.multilineTextAlignment(.center)` | |
| `text-align: right` | `.multilineTextAlignment(.trailing)` | |
| `text-transform: uppercase` | `.textCase(.uppercase)` | |
| `text-transform: lowercase` | `.textCase(.lowercase)` | |
| `white-space: nowrap` | `.fixedSize(horizontal: true, vertical: false)` | Prevents text wrapping |
| `text-overflow: ellipsis` | `.lineLimit(1).truncationMode(.tail)` | Combine with `lineLimit` |
| `word-break: break-all` | (default in SwiftUI -- text wraps automatically) | |

## Borders & Border Radius

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `border: 1px solid #ccc` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color(hex: "cccccc"), lineWidth: 1))` | Match corner radius to any `border-radius` |
| `border-width: 2px` | `lineWidth: 2` in stroke | |
| `border-color: red` | `Color.red` in stroke | |
| `border-style: dashed` | `StrokeStyle(lineWidth: 1, dash: [5, 3])` | |
| `border-bottom: 1px solid #eee` | `.overlay(alignment: .bottom) { Divider() }` | Or use a thin `Rectangle` |
| `border-radius: 8px` | `.clipShape(RoundedRectangle(cornerRadius: 8))` | |
| `border-radius: 50%` | `.clipShape(Circle())` | For square elements |
| `border-radius: 9999px` | `.clipShape(Capsule())` | Pill shape for rectangular elements |
| `border-radius: 8px 8px 0 0` | `.clipShape(.rect(topLeadingRadius: 8, topTrailingRadius: 8))` | Per-corner radii |
| `outline: 2px solid blue` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.blue, lineWidth: 2))` | |
| `outline-offset: 2px` | `.padding(2)` before the overlay | |

## Box Shadow

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `box-shadow: 0 1px 3px rgba(0,0,0,0.1)` | `.shadow(color: .black.opacity(0.1), radius: 3, x: 0, y: 1)` | |
| `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` | `.shadow(color: .black.opacity(0.1), radius: 6, x: 0, y: 4)` | |
| `box-shadow: 0 10px 25px rgba(0,0,0,0.15)` | `.shadow(color: .black.opacity(0.15), radius: 25, x: 0, y: 10)` | |
| `box-shadow: inset 0 2px 4px rgba(0,0,0,0.06)` | `.overlay(RoundedRectangle(cornerRadius: N).stroke(Color.black.opacity(0.06), lineWidth: 1).blur(radius: 2))` | No native inset shadow; approximate |
| `box-shadow: none` | `.shadow(radius: 0)` | |
| Multiple shadows | Chain multiple `.shadow()` modifiers | |

## Overflow

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `overflow: hidden` | `.clipped()` | |
| `overflow: scroll` | `ScrollView` | |
| `overflow-x: scroll` | `ScrollView(.horizontal)` | |
| `overflow-y: scroll` | `ScrollView(.vertical)` | Default axis |
| `overflow: visible` | (default in SwiftUI) | |
| `overflow: auto` | `ScrollView` (shows scrollbar only when needed) | |

## Opacity & Z-Index

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `opacity: 0` | `.opacity(0)` | |
| `opacity: 0.5` | `.opacity(0.5)` | |
| `opacity: 1` | `.opacity(1)` | |
| `z-index: 10` | `.zIndex(10)` | Only meaningful among siblings in a ZStack |
| `z-index: -1` | `.zIndex(-1)` | Places behind siblings |
| `visibility: hidden` | `.opacity(0)` | Still takes up space (unlike `EmptyView()`) |

## Transitions & Animation

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `transition: all 0.3s ease` | `.animation(.easeInOut(duration: 0.3), value: trigger)` | Requires a state value to trigger |
| `transition: opacity 0.2s` | `.animation(.easeInOut(duration: 0.2), value: opacity)` | |
| `transition: transform 0.3s ease-in-out` | `.animation(.easeInOut(duration: 0.3), value: transformValue)` | |
| `transition-duration: 500ms` | `duration: 0.5` in animation | |
| `transition-timing-function: ease-in` | `.easeIn` | |
| `transition-timing-function: ease-out` | `.easeOut` | |
| `transition-timing-function: linear` | `.linear` | |
| `transition-timing-function: cubic-bezier(...)` | `.timingCurve(x1, y1, x2, y2)` | |
| `transform: scale(1.1)` | `.scaleEffect(1.1)` | |
| `transform: rotate(45deg)` | `.rotationEffect(.degrees(45))` | |
| `transform: translateX(10px)` | `.offset(x: 10)` | |
| `transform: translateY(-5px)` | `.offset(y: -5)` | |
| `@keyframes spin` | `withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) { angle = 360 }` | |
| `animation: pulse 2s infinite` | `.opacity(val).animation(.easeInOut(duration: 2).repeatForever())` | |

## Cursor

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `cursor: pointer` | No equivalent on iOS; implicit on `Button` and `NavigationLink` | On macOS: `.onHover { NSCursor.pointingHand.push() }` |
| `cursor: not-allowed` | `.disabled(true)` | Communicates non-interactivity |
| `cursor: grab` | No equivalent on iOS | Use `.draggable()` for drag semantics |
| `pointer-events: none` | `.allowsHitTesting(false)` | |

## Miscellaneous

| CSS | SwiftUI | Notes |
|-----|---------|-------|
| `box-sizing: border-box` | (default in SwiftUI) | All sizing includes padding |
| `list-style: none` | `ForEach` inside `VStack` (not `List`) | `List` adds default styling |
| `user-select: none` | `.textSelection(.disabled)` | iOS 15+ |
| `scroll-behavior: smooth` | `.scrollTargetBehavior(.viewAligned)` | iOS 17+ |
| `object-fit: cover` | `.scaledToFill().clipped()` | |
| `object-fit: contain` | `.scaledToFit()` | |
| `filter: blur(8px)` | `.blur(radius: 8)` | |
| `backdrop-filter: blur(10px)` | `.background(.regularMaterial)` | Use material for backdrop blur |
| `mix-blend-mode: multiply` | `.blendMode(.multiply)` | |
| `clip-path: circle(50%)` | `.clipShape(Circle())` | |
