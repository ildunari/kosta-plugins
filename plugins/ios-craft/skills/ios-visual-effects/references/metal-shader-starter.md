# Metal Shader Starter

5 beginner Metal shaders for SwiftUI with line-by-line MSL comments and SwiftUI integration code.

## Setup

1. Create a new file in Xcode: File > New > File > Metal File (name it `Shaders.metal`)
2. Xcode automatically compiles `.metal` files and makes them available via `ShaderLibrary`
3. Access shaders in SwiftUI using `ShaderLibrary.yourFunctionName()`

---

## 1. Color Shift

Shifts the hue of every pixel by a controllable amount. Good for theming or mood changes.

### Shaders.metal

```metal
#include <metal_stdlib>
using namespace metal;

// Color effect: receives the pixel position and its current color.
// Returns a new color. We rotate hue by converting RGB -> HSV -> rotate -> HSV -> RGB.
[[stitchable]] half4 colorShift(
    float2 position,       // pixel position in view coordinates
    half4 color,           // current RGBA color of this pixel
    float hueRotation      // amount to rotate hue (0.0 to 1.0 = full rotation)
) {
    // Extract RGB channels as floats for math
    float r = float(color.r);
    float g = float(color.g);
    float b = float(color.b);

    // RGB to HSV conversion
    float maxC = max(r, max(g, b));
    float minC = min(r, min(g, b));
    float delta = maxC - minC;

    float hue = 0.0;
    if (delta > 0.0001) {
        if (maxC == r) hue = fmod((g - b) / delta, 6.0);
        else if (maxC == g) hue = (b - r) / delta + 2.0;
        else hue = (r - g) / delta + 4.0;
        hue /= 6.0;
        if (hue < 0.0) hue += 1.0;
    }
    float sat = (maxC > 0.0001) ? delta / maxC : 0.0;
    float val = maxC;

    // Apply hue rotation
    hue = fract(hue + hueRotation);

    // HSV back to RGB
    float c = val * sat;
    float x = c * (1.0 - abs(fmod(hue * 6.0, 2.0) - 1.0));
    float m = val - c;

    float3 rgb;
    if (hue < 1.0/6.0) rgb = float3(c, x, 0);
    else if (hue < 2.0/6.0) rgb = float3(x, c, 0);
    else if (hue < 3.0/6.0) rgb = float3(0, c, x);
    else if (hue < 4.0/6.0) rgb = float3(0, x, c);
    else if (hue < 5.0/6.0) rgb = float3(x, 0, c);
    else rgb = float3(c, 0, x);

    return half4(half3(rgb + m), color.a);
}
```

### SwiftUI Integration

```swift
struct ColorShiftDemo: View {
    @State private var hueShift: Float = 0

    var body: some View {
        VStack {
            Image("photo")
                .resizable()
                .scaledToFit()
                .colorEffect(ShaderLibrary.colorShift(.float(hueShift)))

            Slider(value: $hueShift, in: 0...1)
                .padding()
            Text("Hue: \(hueShift, specifier: "%.2f")")
        }
    }
}
```

---

## 2. Wave Distortion

Warps the view like looking through water. Driven by time for continuous motion.

### Shaders.metal

```metal
// Distortion effect: returns an offset (dx, dy) to shift where each pixel samples from.
// The original pixel at `position` will show the color from `position + return_value`.
[[stitchable]] float2 waveDistortion(
    float2 position,     // current pixel position
    float time,          // elapsed time in seconds (drives the animation)
    float amplitude,     // how far pixels shift (in points)
    float frequency      // how many waves across the view
) {
    // Horizontal wave: shift x based on y position + time
    float dx = sin(position.y * frequency * 0.01 + time * 2.0) * amplitude;
    // Vertical wave: shift y based on x position + time (offset phase for variety)
    float dy = cos(position.x * frequency * 0.01 + time * 2.0) * amplitude;
    return float2(dx, dy);
}
```

### SwiftUI Integration

```swift
struct WaveDistortionDemo: View {
    let startDate = Date()

    var body: some View {
        TimelineView(.animation) { timeline in
            let elapsed = Float(timeline.date.timeIntervalSince(startDate))

            Image("photo")
                .resizable()
                .scaledToFit()
                .distortionEffect(
                    ShaderLibrary.waveDistortion(
                        .float(elapsed),
                        .float(5),    // amplitude
                        .float(8)     // frequency
                    ),
                    maxSampleOffset: CGSize(width: 10, height: 10)
                )
        }
    }
}
```

---

## 3. Pixelation

Reduces resolution by snapping pixel positions to a grid. Classic retro/mosaic effect.

### Shaders.metal

```metal
// Color effect that creates a pixelation look.
// We quantize the position to a grid, but since colorEffect can't sample neighbors,
// we simulate pixelation by modulating color based on grid cell.
// For true pixelation, use layerEffect instead (see note below).
[[stitchable]] half4 pixelate(
    float2 position,       // pixel position
    half4 color,           // current color
    float pixelSize        // size of each "pixel block" in points
) {
    // Quantize position to grid
    float2 gridPos = floor(position / pixelSize) * pixelSize;
    // Use grid position to create a subtle stepped effect
    // True pixelation needs layerEffect to sample from quantized position
    float edge = step(0.5, fract(position.x / pixelSize)) * step(0.5, fract(position.y / pixelSize));
    return half4(color.rgb * half(0.85 + edge * 0.15), color.a);
}
```

**Note**: For true pixelation (sampling from a different position), use `layerEffect`:

```metal
// Layer effect version: can sample from any position in the rendered layer.
[[stitchable]] half4 pixelateFull(
    float2 position,                    // pixel position
    SwiftUI::Layer layer,               // the rendered layer to sample from
    float pixelSize                     // block size
) {
    // Snap to nearest grid cell center
    float2 snapped = floor(position / pixelSize) * pixelSize + pixelSize * 0.5;
    return layer.sample(snapped);
}
```

### SwiftUI Integration

```swift
struct PixelationDemo: View {
    @State private var pixelSize: Float = 1

    var body: some View {
        VStack {
            Image("photo")
                .resizable()
                .scaledToFit()
                .layerEffect(
                    ShaderLibrary.pixelateFull(.float(pixelSize)),
                    maxSampleOffset: CGSize(width: 20, height: 20)
                )

            Slider(value: $pixelSize, in: 1...20)
                .padding()
            Text("Pixel size: \(pixelSize, specifier: "%.0f")")
        }
    }
}
```

---

## 4. Chromatic Aberration

Splits color channels with slight offsets, simulating a lens defect. Adds gritty realism or sci-fi feel.

### Shaders.metal

```metal
// Layer effect: samples the layer at three slightly different positions
// for R, G, B channels to simulate chromatic aberration.
[[stitchable]] half4 chromaticAberration(
    float2 position,                    // pixel position
    SwiftUI::Layer layer,               // rendered layer
    float spread                        // how far apart channels shift (in points)
) {
    // Red channel: sample slightly to the left
    half4 redSample = layer.sample(position + float2(-spread, 0));
    // Green channel: sample at original position (no shift)
    half4 greenSample = layer.sample(position);
    // Blue channel: sample slightly to the right
    half4 blueSample = layer.sample(position + float2(spread, 0));

    // Combine: take R from red sample, G from green, B from blue
    return half4(redSample.r, greenSample.g, blueSample.b, greenSample.a);
}
```

### SwiftUI Integration

```swift
struct ChromaticDemo: View {
    @State private var spread: Float = 0

    var body: some View {
        VStack {
            Image("photo")
                .resizable()
                .scaledToFit()
                .layerEffect(
                    ShaderLibrary.chromaticAberration(.float(spread)),
                    maxSampleOffset: CGSize(width: 20, height: 0)
                )

            Slider(value: $spread, in: 0...10)
                .padding()
            Text("Spread: \(spread, specifier: "%.1f")pt")
        }
    }
}
```

---

## 5. Vignette

Darkens edges of the view, drawing focus to the center. Classic photography/cinema effect.

### Shaders.metal

```metal
// Color effect: darkens pixels based on distance from center.
[[stitchable]] half4 vignette(
    float2 position,       // pixel position in view coordinates
    half4 color,           // current pixel color
    float2 viewSize,       // total view size (width, height)
    float intensity        // how strong the darkening is (0 = none, 1 = heavy)
) {
    // Normalize position to -1..1 range with center at (0,0)
    float2 uv = (position / viewSize) * 2.0 - 1.0;

    // Compute distance from center (adjusted for aspect ratio)
    float aspect = viewSize.x / viewSize.y;
    uv.x *= aspect;
    float dist = length(uv);

    // Smooth vignette curve: dark at edges, bright at center
    // smoothstep creates a gradual transition
    float vignette = 1.0 - smoothstep(0.4, 1.4, dist * intensity);

    // Multiply color by vignette factor (preserving alpha)
    return half4(color.rgb * half(vignette), color.a);
}
```

### SwiftUI Integration

```swift
struct VignetteDemo: View {
    @State private var intensity: Float = 1.0

    var body: some View {
        GeometryReader { geo in
            VStack {
                Image("photo")
                    .resizable()
                    .scaledToFit()
                    .colorEffect(
                        ShaderLibrary.vignette(
                            .float2(Float(geo.size.width), Float(geo.size.height)),
                            .float(intensity)
                        )
                    )

                Slider(value: $intensity, in: 0...2)
                    .padding()
                Text("Intensity: \(intensity, specifier: "%.1f")")
            }
        }
    }
}
```

---

## Shader Types Quick Reference

| SwiftUI Modifier | MSL Signature | Use Case |
|---|---|---|
| `.colorEffect()` | `(float2 pos, half4 color, ...) -> half4` | Per-pixel color transform (tint, shift, vignette) |
| `.distortionEffect()` | `(float2 pos, ...) -> float2` | Returns offset to warp sampling position |
| `.layerEffect()` | `(float2 pos, SwiftUI::Layer, ...) -> half4` | Can sample any position in the layer (blur, pixelate, aberration) |

**Important**: Always specify `maxSampleOffset` for distortion and layer effects so SwiftUI knows how much extra area to render.
