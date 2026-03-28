# Component Library Starter

8 complete SwiftUI components using design tokens. Each includes states (default, pressed, disabled), dark mode support, accessibility labels, and previews.

Assumes `DSColor` and `Spacing` tokens are defined (see `swiftui-color-tokens-patterns.md`).

---

## Shared Token Definitions

```swift
enum Spacing {
    static let xxxs: CGFloat = 2
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

enum CornerRadius {
    static let small: CGFloat = 6
    static let medium: CGFloat = 10
    static let large: CGFloat = 16
    static let full: CGFloat = 999
}
```

---

## 1. PrimaryButton

```swift
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false

    @Environment(\.isEnabled) private var isEnabled

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.8)
                }
                Text(title)
                    .font(.body.weight(.semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.sm)
            .padding(.horizontal, Spacing.lg)
            .background(isDisabled ? DSColor.textTertiary : DSColor.accent)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.medium))
        }
        .disabled(isDisabled || isLoading)
        .accessibilityLabel(isLoading ? "\(title), loading" : title)
        .accessibilityAddTraits(.isButton)
    }
}

#Preview("Primary Button States") {
    VStack(spacing: 16) {
        PrimaryButton(title: "Continue", action: {})
        PrimaryButton(title: "Saving...", action: {}, isLoading: true)
        PrimaryButton(title: "Unavailable", action: {}, isDisabled: true)
    }
    .padding()
}
```

---

## 2. SecondaryButton

```swift
struct SecondaryButton: View {
    let title: String
    let action: () -> Void
    var isDisabled: Bool = false

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.body.weight(.medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.sm)
                .padding(.horizontal, Spacing.lg)
                .foregroundStyle(isDisabled ? DSColor.textTertiary : DSColor.accent)
                .background(
                    RoundedRectangle(cornerRadius: CornerRadius.medium)
                        .stroke(isDisabled ? DSColor.textTertiary : DSColor.accent, lineWidth: 1.5)
                )
        }
        .disabled(isDisabled)
        .accessibilityAddTraits(.isButton)
    }
}

#Preview("Secondary Button States") {
    VStack(spacing: 16) {
        SecondaryButton(title: "Cancel", action: {})
        SecondaryButton(title: "Disabled", action: {}, isDisabled: true)
    }
    .padding()
}
```

---

## 3. Card

```swift
struct DSCard<Content: View>: View {
    let content: () -> Content
    var padding: CGFloat = Spacing.md

    init(padding: CGFloat = Spacing.md, @ViewBuilder content: @escaping () -> Content) {
        self.padding = padding
        self.content = content
    }

    var body: some View {
        content()
            .padding(padding)
            .background(DSColor.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.large))
            .overlay {
                RoundedRectangle(cornerRadius: CornerRadius.large)
                    .stroke(DSColor.border, lineWidth: 0.5)
            }
            .shadow(color: .black.opacity(0.04), radius: 8, y: 4)
    }
}

#Preview("Card") {
    DSCard {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Card Title").font(.headline)
            Text("Card description goes here with details.")
                .font(.subheadline)
                .foregroundStyle(DSColor.textSecondary)
        }
    }
    .padding()
}
```

---

## 4. Badge

```swift
struct DSBadge: View {
    enum Variant {
        case `default`, success, warning, error, info

        var background: Color {
            switch self {
            case .default: DSColor.surfaceSecondary
            case .success: DSColor.success.opacity(0.15)
            case .warning: DSColor.warning.opacity(0.15)
            case .error: DSColor.error.opacity(0.15)
            case .info: DSColor.accent.opacity(0.15)
            }
        }

        var foreground: Color {
            switch self {
            case .default: DSColor.textSecondary
            case .success: DSColor.success
            case .warning: DSColor.warning
            case .error: DSColor.error
            case .info: DSColor.accent
            }
        }
    }

    let text: String
    var variant: Variant = .default

    var body: some View {
        Text(text)
            .font(.caption.weight(.medium))
            .padding(.horizontal, Spacing.xs)
            .padding(.vertical, Spacing.xxxs)
            .background(variant.background)
            .foregroundStyle(variant.foreground)
            .clipShape(Capsule())
            .accessibilityLabel(text)
    }
}

#Preview("Badge Variants") {
    HStack(spacing: 8) {
        DSBadge(text: "Default")
        DSBadge(text: "Success", variant: .success)
        DSBadge(text: "Warning", variant: .warning)
        DSBadge(text: "Error", variant: .error)
        DSBadge(text: "Info", variant: .info)
    }
    .padding()
}
```

---

## 5. DSTextField

```swift
struct DSTextField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var errorMessage: String? = nil
    var isDisabled: Bool = false

    @FocusState private var isFocused: Bool

    private var borderColor: Color {
        if let _ = errorMessage { return DSColor.error }
        if isFocused { return DSColor.accent }
        return DSColor.border
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xxs) {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(DSColor.textSecondary)

            TextField(placeholder, text: $text)
                .font(.body)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.sm)
                .background(isDisabled ? DSColor.surfaceSecondary : DSColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.small))
                .overlay {
                    RoundedRectangle(cornerRadius: CornerRadius.small)
                        .stroke(borderColor, lineWidth: isFocused ? 2 : 1)
                }
                .focused($isFocused)
                .disabled(isDisabled)

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(DSColor.error)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
        .accessibilityValue(text.isEmpty ? "empty" : text)
    }
}

#Preview("Text Field States") {
    VStack(spacing: 20) {
        DSTextField(label: "Email", text: .constant(""), placeholder: "you@example.com")
        DSTextField(label: "Name", text: .constant("John"))
        DSTextField(label: "Password", text: .constant("123"), errorMessage: "Too short")
        DSTextField(label: "Disabled", text: .constant("Locked"), isDisabled: true)
    }
    .padding()
}
```

---

## 6. Avatar

```swift
struct DSAvatar: View {
    enum Size {
        case small, medium, large

        var dimension: CGFloat {
            switch self {
            case .small: 32
            case .medium: 44
            case .large: 64
            }
        }

        var font: Font {
            switch self {
            case .small: .caption.weight(.semibold)
            case .medium: .body.weight(.semibold)
            case .large: .title3.weight(.semibold)
            }
        }
    }

    let initials: String
    var image: Image? = nil
    var size: Size = .medium

    var body: some View {
        Group {
            if let image {
                image
                    .resizable()
                    .scaledToFill()
            } else {
                Text(initials.prefix(2).uppercased())
                    .font(size.font)
                    .foregroundStyle(.white)
            }
        }
        .frame(width: size.dimension, height: size.dimension)
        .background(DSColor.accent)
        .clipShape(Circle())
        .accessibilityLabel("Avatar, \(initials)")
    }
}

#Preview("Avatar Sizes") {
    HStack(spacing: 12) {
        DSAvatar(initials: "JD", size: .small)
        DSAvatar(initials: "JD", size: .medium)
        DSAvatar(initials: "JD", size: .large)
    }
    .padding()
}
```

---

## 7. SegmentedControl

```swift
struct DSSegmentedControl: View {
    let options: [String]
    @Binding var selected: Int
    @Namespace private var segmentNS

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(options.enumerated()), id: \.offset) { index, option in
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                        selected = index
                    }
                } label: {
                    Text(option)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(selected == index ? DSColor.textPrimary : DSColor.textSecondary)
                        .padding(.vertical, Spacing.xs)
                        .frame(maxWidth: .infinity)
                        .background {
                            if selected == index {
                                RoundedRectangle(cornerRadius: CornerRadius.small)
                                    .fill(DSColor.surface)
                                    .shadow(color: .black.opacity(0.06), radius: 2, y: 1)
                                    .matchedGeometryEffect(id: "segment", in: segmentNS)
                            }
                        }
                }
                .accessibilityLabel(option)
                .accessibilityAddTraits(selected == index ? .isSelected : [])
            }
        }
        .padding(Spacing.xxxs)
        .background(DSColor.surfaceSecondary)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.small + 2))
    }
}

#Preview("Segmented Control") {
    struct Preview: View {
        @State private var selected = 0
        var body: some View {
            DSSegmentedControl(options: ["Day", "Week", "Month"], selected: $selected)
                .padding()
        }
    }
    return Preview()
}
```

---

## 8. Toast

```swift
struct DSToast: View {
    enum Style {
        case success, error, info

        var icon: String {
            switch self {
            case .success: "checkmark.circle.fill"
            case .error: "exclamationmark.circle.fill"
            case .info: "info.circle.fill"
            }
        }

        var color: Color {
            switch self {
            case .success: DSColor.success
            case .error: DSColor.error
            case .info: DSColor.accent
            }
        }
    }

    let message: String
    var style: Style = .info
    @Binding var isPresented: Bool

    var body: some View {
        if isPresented {
            HStack(spacing: Spacing.xs) {
                Image(systemName: style.icon)
                    .foregroundStyle(style.color)
                Text(message)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(DSColor.textPrimary)
                Spacer()
                Button {
                    withAnimation { isPresented = false }
                } label: {
                    Image(systemName: "xmark")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(DSColor.textTertiary)
                }
                .accessibilityLabel("Dismiss")
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(DSColor.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.medium))
            .overlay {
                RoundedRectangle(cornerRadius: CornerRadius.medium)
                    .stroke(DSColor.border, lineWidth: 0.5)
            }
            .shadow(color: .black.opacity(0.08), radius: 12, y: 4)
            .transition(.move(edge: .top).combined(with: .opacity))
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    withAnimation(.easeInOut(duration: 0.3)) { isPresented = false }
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(style == .error ? "Error" : style == .success ? "Success" : "Info"): \(message)")
        }
    }
}

#Preview("Toast Styles") {
    struct Preview: View {
        @State private var show1 = true
        @State private var show2 = true
        @State private var show3 = true
        var body: some View {
            VStack(spacing: 12) {
                DSToast(message: "Changes saved successfully", style: .success, isPresented: $show1)
                DSToast(message: "Something went wrong", style: .error, isPresented: $show2)
                DSToast(message: "New version available", style: .info, isPresented: $show3)
            }
            .padding()
        }
    }
    return Preview()
}
```
