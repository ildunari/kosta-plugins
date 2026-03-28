# Screen Recipes

Ten complete, production-ready SwiftUI screen templates. Each recipe compiles standalone, uses semantic colors for dark mode, includes accessibility labels, and provides a preview with sample data.

---

## 1. Master-Detail List

A scrollable list that pushes to a detail view. Works on iPhone with `NavigationStack` and on iPad with `NavigationSplitView`.

```swift
import SwiftUI

// MARK: - Model

struct Contact: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let role: String
    let email: String
    let avatarSystemName: String

    static let samples: [Contact] = [
        Contact(name: "Ada Lovelace", role: "Engineer", email: "ada@example.com", avatarSystemName: "person.circle.fill"),
        Contact(name: "Grace Hopper", role: "Rear Admiral", email: "grace@example.com", avatarSystemName: "person.circle.fill"),
        Contact(name: "Alan Turing", role: "Mathematician", email: "alan@example.com", avatarSystemName: "person.circle.fill"),
    ]
}

// MARK: - List View

struct ContactListView: View {
    let contacts: [Contact]
    @State private var selectedContact: Contact?
    @State private var searchText = ""

    var filteredContacts: [Contact] {
        if searchText.isEmpty { return contacts }
        return contacts.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationSplitView {
            List(filteredContacts, selection: $selectedContact) { contact in
                NavigationLink(value: contact) {
                    HStack(spacing: 12) {
                        Image(systemName: contact.avatarSystemName)
                            .font(.title2)
                            .foregroundStyle(.secondary)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading) {
                            Text(contact.name).font(.headline)
                            Text(contact.role).font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(contact.name), \(contact.role)")
                }
            }
            .searchable(text: $searchText, prompt: "Search contacts")
            .navigationTitle("Contacts")
            .overlay {
                if filteredContacts.isEmpty {
                    ContentUnavailableView.search(text: searchText)
                }
            }
        } detail: {
            if let contact = selectedContact {
                ContactDetailView(contact: contact)
            } else {
                ContentUnavailableView("Select a Contact",
                    systemImage: "person.crop.circle",
                    description: Text("Choose someone from the list."))
            }
        }
    }
}

// MARK: - Detail View

struct ContactDetailView: View {
    let contact: Contact

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Image(systemName: contact.avatarSystemName)
                    .font(.system(size: 80))
                    .foregroundStyle(.tint)
                    .accessibilityHidden(true)

                Text(contact.name).font(.title.bold())
                Text(contact.role).font(.title3).foregroundStyle(.secondary)

                GroupBox("Contact Info") {
                    LabeledContent("Email", value: contact.email)
                }
                .padding(.horizontal)
            }
            .padding(.top, 40)
        }
        .navigationTitle(contact.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Preview

#Preview {
    ContactListView(contacts: Contact.samples)
}
```

---

## 2. Settings Screen

Grouped form with toggles, pickers, navigation links, and an app version footer.

```swift
import SwiftUI

struct SettingsView: View {
    // Persisted preferences
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("soundEnabled") private var soundEnabled = true
    @AppStorage("appearanceMode") private var appearanceMode = "system"
    @AppStorage("syncFrequency") private var syncFrequency = "hourly"

    // Sheet state
    @State private var isShowingAccount = false
    @State private var isShowingClearDataAlert = false

    var body: some View {
        Form {
            // Account section
            Section {
                Button(action: { isShowingAccount = true }) {
                    HStack(spacing: 12) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.largeTitle)
                            .foregroundStyle(.tint)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading) {
                            Text("Jane Doe").font(.headline)
                            Text("jane@example.com").font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                    .accessibilityLabel("Account settings for Jane Doe")
                }
            }

            // Notifications
            Section("Notifications") {
                Toggle("Push Notifications", isOn: $notificationsEnabled)
                    .accessibilityLabel("Enable push notifications")
                Toggle("Sound", isOn: $soundEnabled)
                    .accessibilityLabel("Enable notification sounds")
            }

            // Appearance
            Section("Appearance") {
                Picker("Theme", selection: $appearanceMode) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }
                .accessibilityLabel("App theme")
            }

            // Data
            Section("Data") {
                Picker("Sync Frequency", selection: $syncFrequency) {
                    Text("Real-time").tag("realtime")
                    Text("Hourly").tag("hourly")
                    Text("Daily").tag("daily")
                    Text("Manual").tag("manual")
                }
                .accessibilityLabel("Data sync frequency")

                Button("Clear Local Data", role: .destructive) {
                    isShowingClearDataAlert = true
                }
                .accessibilityLabel("Clear all local data")
            }

            // About
            Section("About") {
                NavigationLink("Privacy Policy") { Text("Privacy Policy content") }
                NavigationLink("Terms of Service") { Text("Terms content") }
                LabeledContent("Version", value: "1.2.0 (42)")
            }
        }
        .navigationTitle("Settings")
        .sheet(isPresented: $isShowingAccount) {
            Text("Account View") // Replace with real account view
        }
        .alert("Clear Local Data?", isPresented: $isShowingClearDataAlert) {
            Button("Clear", role: .destructive) { /* clear data */ }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This removes all cached data. Your account data is safe in the cloud.")
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
    }
}
```

---

## 3. Login / Signup Form with Validation

A form with email and password fields, real-time validation feedback, and a submit button.

```swift
import SwiftUI

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    // Validation
    private var isEmailValid: Bool {
        email.contains("@") && email.contains(".")
    }

    private var isPasswordValid: Bool {
        password.count >= 8
    }

    private var isConfirmValid: Bool {
        !isSignUp || password == confirmPassword
    }

    private var isFormValid: Bool {
        isEmailValid && isPasswordValid && isConfirmValid
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "person.badge.key.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.tint)
                        .accessibilityHidden(true)
                    Text(isSignUp ? "Create Account" : "Welcome Back")
                        .font(.title.bold())
                    Text(isSignUp ? "Sign up to get started" : "Sign in to continue")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 40)

                // Fields
                VStack(spacing: 16) {
                    // Email
                    VStack(alignment: .leading, spacing: 4) {
                        TextField("Email", text: $email)
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .padding()
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .accessibilityLabel("Email address")

                        if !email.isEmpty && !isEmailValid {
                            Text("Enter a valid email address")
                                .font(.caption).foregroundStyle(.red)
                                .accessibilityLabel("Email validation error: enter a valid email address")
                        }
                    }

                    // Password
                    VStack(alignment: .leading, spacing: 4) {
                        SecureField("Password", text: $password)
                            .textContentType(isSignUp ? .newPassword : .password)
                            .padding()
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .accessibilityLabel("Password")

                        if !password.isEmpty && !isPasswordValid {
                            Text("Password must be at least 8 characters")
                                .font(.caption).foregroundStyle(.red)
                                .accessibilityLabel("Password validation error: must be at least 8 characters")
                        }
                    }

                    // Confirm password (sign-up only)
                    if isSignUp {
                        VStack(alignment: .leading, spacing: 4) {
                            SecureField("Confirm Password", text: $confirmPassword)
                                .textContentType(.newPassword)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                .accessibilityLabel("Confirm password")

                            if !confirmPassword.isEmpty && !isConfirmValid {
                                Text("Passwords do not match")
                                    .font(.caption).foregroundStyle(.red)
                                    .accessibilityLabel("Passwords do not match")
                            }
                        }
                    }
                }
                .padding(.horizontal)

                // Error message
                if let errorMessage {
                    Text(errorMessage)
                        .font(.callout)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                // Submit button
                Button(action: submit) {
                    Group {
                        if isLoading {
                            ProgressView()
                        } else {
                            Text(isSignUp ? "Create Account" : "Sign In")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(isFormValid ? Color.accentColor : Color.gray.opacity(0.3))
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(!isFormValid || isLoading)
                .padding(.horizontal)
                .accessibilityLabel(isSignUp ? "Create account" : "Sign in")

                // Toggle mode
                Button(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up") {
                    withAnimation { isSignUp.toggle() }
                }
                .font(.subheadline)
                .accessibilityLabel(isSignUp ? "Switch to sign in" : "Switch to sign up")
            }
        }
        .background(Color(.systemGroupedBackground))
    }

    private func submit() {
        isLoading = true
        errorMessage = nil
        // Replace with real auth logic
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isLoading = false
        }
    }
}

#Preview {
    LoginView()
}
```

---

## 4. Onboarding Carousel

A swipeable page-based onboarding flow with a "Get Started" button on the last page.

```swift
import SwiftUI

struct OnboardingPage: Identifiable {
    let id = UUID()
    let systemImage: String
    let title: String
    let subtitle: String
    let accentColor: Color

    static let pages: [OnboardingPage] = [
        OnboardingPage(systemImage: "sparkles", title: "Welcome", subtitle: "Discover everything this app can do for you.", accentColor: .blue),
        OnboardingPage(systemImage: "bell.badge.fill", title: "Stay Notified", subtitle: "Get alerts when things that matter happen.", accentColor: .orange),
        OnboardingPage(systemImage: "lock.shield.fill", title: "Private & Secure", subtitle: "Your data stays on your device. Always.", accentColor: .green),
    ]
}

struct OnboardingView: View {
    @State private var currentPage = 0
    let pages = OnboardingPage.pages
    var onComplete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $currentPage) {
                ForEach(Array(pages.enumerated()), id: \.element.id) { index, page in
                    VStack(spacing: 24) {
                        Spacer()

                        Image(systemName: page.systemImage)
                            .font(.system(size: 80))
                            .foregroundStyle(page.accentColor)
                            .accessibilityHidden(true)

                        Text(page.title)
                            .font(.title.bold())

                        Text(page.subtitle)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)

                        Spacer()
                        Spacer()
                    }
                    .tag(index)
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(page.title). \(page.subtitle)")
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))

            // Bottom button
            Button(action: advanceOrComplete) {
                Text(currentPage == pages.count - 1 ? "Get Started" : "Next")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 20)
            .accessibilityLabel(currentPage == pages.count - 1 ? "Get started" : "Go to next page")

            // Skip button (hidden on last page)
            if currentPage < pages.count - 1 {
                Button("Skip") { onComplete() }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 16)
                    .accessibilityLabel("Skip onboarding")
            }
        }
        .background(Color(.systemBackground))
    }

    private func advanceOrComplete() {
        if currentPage < pages.count - 1 {
            withAnimation { currentPage += 1 }
        } else {
            onComplete()
        }
    }
}

#Preview {
    OnboardingView(onComplete: { print("Done") })
}
```

---

## 5. Profile Page

User profile with avatar, stats row, and action buttons.

```swift
import SwiftUI

struct ProfileView: View {
    @State private var isShowingEditSheet = false

    // Sample data -- replace with real model
    let username = "janedoe"
    let displayName = "Jane Doe"
    let bio = "iOS developer. Coffee enthusiast. Building things that matter."
    let postsCount = 142
    let followersCount = 1_280
    let followingCount = 394

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Avatar
                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: 90))
                    .foregroundStyle(.tint)
                    .accessibilityHidden(true)

                // Name and bio
                VStack(spacing: 4) {
                    Text(displayName).font(.title2.bold())
                    Text("@\(username)").font(.subheadline).foregroundStyle(.secondary)
                    Text(bio)
                        .font(.body)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.top, 4)
                }

                // Stats row
                HStack(spacing: 32) {
                    statColumn(value: postsCount, label: "Posts")
                    statColumn(value: followersCount, label: "Followers")
                    statColumn(value: followingCount, label: "Following")
                }
                .padding(.vertical, 8)

                // Action buttons
                HStack(spacing: 12) {
                    Button(action: { isShowingEditSheet = true }) {
                        Text("Edit Profile")
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .accessibilityLabel("Edit your profile")

                    Button(action: { /* share action */ }) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.subheadline.weight(.semibold))
                            .padding(.vertical, 10)
                            .padding(.horizontal, 16)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .accessibilityLabel("Share profile")
                }
                .padding(.horizontal)

                Divider().padding(.horizontal)

                // Placeholder content grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 2) {
                    ForEach(0..<9, id: \.self) { index in
                        Rectangle()
                            .fill(Color(.tertiarySystemGroupedBackground))
                            .aspectRatio(1, contentMode: .fit)
                            .accessibilityLabel("Post \(index + 1)")
                    }
                }
            }
            .padding(.top)
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isShowingEditSheet) {
            Text("Edit Profile View") // Replace with real edit view
        }
    }

    private func statColumn(value: Int, label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(value)").font(.headline)
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(value) \(label)")
    }
}

#Preview {
    NavigationStack {
        ProfileView()
    }
}
```

---

## 6. Search Screen with Debounce

A search view that waits 300ms after the user stops typing before filtering results.

```swift
import SwiftUI
import Combine

struct SearchableItem: Identifiable {
    let id = UUID()
    let title: String
    let category: String
    let systemImage: String

    static let samples: [SearchableItem] = [
        SearchableItem(title: "SwiftUI Basics", category: "Tutorial", systemImage: "book.fill"),
        SearchableItem(title: "Combine Framework", category: "Tutorial", systemImage: "book.fill"),
        SearchableItem(title: "WWDC 2024 Recap", category: "Article", systemImage: "newspaper.fill"),
        SearchableItem(title: "Core Data Migration", category: "Guide", systemImage: "cylinder.split.1x2.fill"),
        SearchableItem(title: "Accessibility Best Practices", category: "Guide", systemImage: "accessibility.fill"),
    ]
}

@Observable
class SearchViewModel {
    var query = ""
    var results: [SearchableItem] = []
    var isSearching = false

    private let allItems: [SearchableItem]
    private var searchTask: Task<Void, Never>?

    init(items: [SearchableItem] = SearchableItem.samples) {
        self.allItems = items
    }

    func search() {
        searchTask?.cancel()

        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            results = []
            isSearching = false
            return
        }

        isSearching = true

        // Debounce: wait 300ms before searching
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))

            guard !Task.isCancelled else { return }

            let filtered = allItems.filter {
                $0.title.localizedCaseInsensitiveContains(query) ||
                $0.category.localizedCaseInsensitiveContains(query)
            }

            await MainActor.run {
                results = filtered
                isSearching = false
            }
        }
    }
}

struct SearchScreenView: View {
    @State private var viewModel = SearchViewModel()

    var body: some View {
        List {
            if viewModel.isSearching {
                HStack {
                    Spacer()
                    ProgressView("Searching...")
                    Spacer()
                }
                .accessibilityLabel("Searching")
            }

            ForEach(viewModel.results) { item in
                HStack(spacing: 12) {
                    Image(systemName: item.systemImage)
                        .foregroundStyle(.tint)
                        .frame(width: 30)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading) {
                        Text(item.title).font(.body)
                        Text(item.category).font(.caption).foregroundStyle(.secondary)
                    }
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(item.title), \(item.category)")
            }
        }
        .searchable(text: $viewModel.query, prompt: "Search articles and tutorials")
        .onChange(of: viewModel.query) { _, _ in
            viewModel.search()
        }
        .navigationTitle("Search")
        .overlay {
            if viewModel.query.isEmpty {
                ContentUnavailableView("Search", systemImage: "magnifyingglass",
                    description: Text("Type to find articles and tutorials."))
            } else if !viewModel.isSearching && viewModel.results.isEmpty {
                ContentUnavailableView.search(text: viewModel.query)
            }
        }
    }
}

#Preview {
    NavigationStack {
        SearchScreenView()
    }
}
```

---

## 7. Dashboard with Cards and Metrics

A scrollable dashboard showing key metrics in cards.

```swift
import SwiftUI

struct Metric: Identifiable {
    let id = UUID()
    let title: String
    let value: String
    let trend: String
    let trendUp: Bool
    let systemImage: String
    let color: Color

    static let samples: [Metric] = [
        Metric(title: "Revenue", value: "$12,450", trend: "+8.2%", trendUp: true, systemImage: "dollarsign.circle.fill", color: .green),
        Metric(title: "Users", value: "3,287", trend: "+12.5%", trendUp: true, systemImage: "person.2.fill", color: .blue),
        Metric(title: "Orders", value: "184", trend: "-2.1%", trendUp: false, systemImage: "cart.fill", color: .orange),
        Metric(title: "Rating", value: "4.8", trend: "+0.3", trendUp: true, systemImage: "star.fill", color: .yellow),
    ]
}

struct DashboardView: View {
    let metrics = Metric.samples
    @State private var selectedPeriod = "week"

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Period picker
                Picker("Period", selection: $selectedPeriod) {
                    Text("Day").tag("day")
                    Text("Week").tag("week")
                    Text("Month").tag("month")
                    Text("Year").tag("year")
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .accessibilityLabel("Time period selector")

                // Metrics grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(metrics) { metric in
                        MetricCardView(metric: metric)
                    }
                }
                .padding(.horizontal)

                // Recent activity section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recent Activity")
                        .font(.headline)
                        .padding(.horizontal)

                    ForEach(0..<3, id: \.self) { index in
                        HStack(spacing: 12) {
                            Circle()
                                .fill(Color.accentColor.opacity(0.2))
                                .frame(width: 40, height: 40)
                                .overlay {
                                    Image(systemName: "bell.fill")
                                        .foregroundStyle(.tint)
                                }
                                .accessibilityHidden(true)

                            VStack(alignment: .leading) {
                                Text("Activity item \(index + 1)").font(.subheadline)
                                Text("\(index + 1)h ago").font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                        .padding(.horizontal)
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("Activity item \(index + 1), \(index + 1) hours ago")
                    }
                }
            }
            .padding(.top)
        }
        .navigationTitle("Dashboard")
        .background(Color(.systemGroupedBackground))
    }
}

struct MetricCardView: View {
    let metric: Metric

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: metric.systemImage)
                    .foregroundStyle(metric.color)
                    .accessibilityHidden(true)
                Spacer()
                Text(metric.trend)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(metric.trendUp ? .green : .red)
            }

            Text(metric.value)
                .font(.title2.bold())

            Text(metric.title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(metric.title): \(metric.value), \(metric.trend)")
    }
}

#Preview {
    NavigationStack {
        DashboardView()
    }
}
```

---

## 8. Image Gallery Grid

A photo gallery using `LazyVGrid` with tap-to-view-detail.

```swift
import SwiftUI

struct GalleryItem: Identifiable {
    let id = UUID()
    let color: Color
    let title: String

    static let samples: [GalleryItem] = (1...20).map { i in
        GalleryItem(
            color: [Color.blue, .green, .orange, .purple, .pink, .teal][i % 6],
            title: "Photo \(i)"
        )
    }
}

struct GalleryView: View {
    let items = GalleryItem.samples
    @State private var selectedItem: GalleryItem?

    private let columns = [
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2),
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 2) {
                ForEach(items) { item in
                    Button(action: { selectedItem = item }) {
                        Rectangle()
                            .fill(item.color.gradient)
                            .aspectRatio(1, contentMode: .fit)
                            .overlay {
                                Image(systemName: "photo")
                                    .font(.title2)
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                    }
                    .accessibilityLabel(item.title)
                }
            }
        }
        .navigationTitle("Gallery")
        .sheet(item: $selectedItem) { item in
            NavigationStack {
                VStack {
                    Spacer()
                    RoundedRectangle(cornerRadius: 16)
                        .fill(item.color.gradient)
                        .aspectRatio(4/3, contentMode: .fit)
                        .overlay {
                            Image(systemName: "photo.fill")
                                .font(.system(size: 60))
                                .foregroundStyle(.white.opacity(0.5))
                        }
                        .padding()
                    Text(item.title).font(.title2.bold())
                    Spacer()
                }
                .navigationTitle(item.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { selectedItem = nil }
                    }
                }
            }
        }
    }
}

// Make GalleryItem work with .sheet(item:)
extension GalleryItem: Equatable {
    static func == (lhs: GalleryItem, rhs: GalleryItem) -> Bool { lhs.id == rhs.id }
}

#Preview {
    NavigationStack {
        GalleryView()
    }
}
```

---

## 9. Chat / Messaging View

A messaging screen with scroll-to-bottom behavior and a text input bar.

```swift
import SwiftUI

struct ChatMessage: Identifiable {
    let id = UUID()
    let text: String
    let isFromMe: Bool
    let timestamp: Date

    static let samples: [ChatMessage] = [
        ChatMessage(text: "Hey, how's it going?", isFromMe: false, timestamp: .now.addingTimeInterval(-300)),
        ChatMessage(text: "Pretty good! Working on a SwiftUI app.", isFromMe: true, timestamp: .now.addingTimeInterval(-240)),
        ChatMessage(text: "Nice! What kind of app?", isFromMe: false, timestamp: .now.addingTimeInterval(-180)),
        ChatMessage(text: "A task manager with a cool dashboard.", isFromMe: true, timestamp: .now.addingTimeInterval(-60)),
    ]
}

struct ChatView: View {
    @State private var messages = ChatMessage.samples
    @State private var newMessage = ""
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(messages) { message in
                            ChatBubbleView(message: message)
                                .id(message.id)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
                .onChange(of: messages.count) { _, _ in
                    if let lastId = messages.last?.id {
                        withAnimation(.easeOut(duration: 0.2)) {
                            proxy.scrollTo(lastId, anchor: .bottom)
                        }
                    }
                }
                .onAppear {
                    if let lastId = messages.last?.id {
                        proxy.scrollTo(lastId, anchor: .bottom)
                    }
                }
            }

            Divider()

            // Input bar
            HStack(spacing: 12) {
                TextField("Message", text: $newMessage, axis: .vertical)
                    .lineLimit(1...4)
                    .padding(10)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .focused($isInputFocused)
                    .accessibilityLabel("Type a message")

                Button(action: sendMessage) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title)
                        .foregroundStyle(newMessage.isEmpty ? .gray : .accentColor)
                }
                .disabled(newMessage.trimmingCharacters(in: .whitespaces).isEmpty)
                .accessibilityLabel("Send message")
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(.systemBackground))
        }
        .navigationTitle("Chat")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func sendMessage() {
        let trimmed = newMessage.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        messages.append(ChatMessage(text: trimmed, isFromMe: true, timestamp: .now))
        newMessage = ""
    }
}

struct ChatBubbleView: View {
    let message: ChatMessage

    var body: some View {
        HStack {
            if message.isFromMe { Spacer(minLength: 60) }

            Text(message.text)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(message.isFromMe ? Color.accentColor : Color(.secondarySystemGroupedBackground))
                .foregroundStyle(message.isFromMe ? .white : .primary)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .accessibilityLabel("\(message.isFromMe ? "You" : "Them"): \(message.text)")

            if !message.isFromMe { Spacer(minLength: 60) }
        }
    }
}

#Preview {
    NavigationStack {
        ChatView()
    }
}
```

---

## 10. Empty State / Error State / Loading State

A reusable pattern for showing loading, empty, and error states before content appears.

```swift
import SwiftUI

// MARK: - State Enum

enum LoadingState<T> {
    case idle
    case loading
    case loaded(T)
    case empty
    case error(String)
}

// MARK: - Reusable State Container

struct StatefulView<T, Content: View>: View {
    let state: LoadingState<T>
    let emptyTitle: String
    let emptySystemImage: String
    let emptyDescription: String
    let retryAction: (() -> Void)?
    @ViewBuilder let content: (T) -> Content

    var body: some View {
        switch state {
        case .idle:
            Color.clear

        case .loading:
            VStack(spacing: 12) {
                ProgressView()
                    .controlSize(.large)
                Text("Loading...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityLabel("Loading content")

        case .loaded(let data):
            content(data)

        case .empty:
            ContentUnavailableView(emptyTitle,
                systemImage: emptySystemImage,
                description: Text(emptyDescription))

        case .error(let message):
            ContentUnavailableView {
                Label("Something Went Wrong", systemImage: "exclamationmark.triangle.fill")
            } description: {
                Text(message)
            } actions: {
                if let retryAction {
                    Button("Try Again", action: retryAction)
                        .buttonStyle(.bordered)
                        .accessibilityLabel("Retry loading")
                }
            }
        }
    }
}

// MARK: - Example Usage

struct ArticleListView: View {
    @State private var state: LoadingState<[String]> = .idle

    var body: some View {
        StatefulView(
            state: state,
            emptyTitle: "No Articles",
            emptySystemImage: "doc.text",
            emptyDescription: "Articles you save will appear here.",
            retryAction: loadArticles
        ) { articles in
            List(articles, id: \.self) { article in
                Text(article)
                    .accessibilityLabel(article)
            }
        }
        .navigationTitle("Articles")
        .toolbar {
            // Demo buttons to cycle through states
            ToolbarItemGroup(placement: .secondaryAction) {
                Button("Show Loading") { state = .loading }
                Button("Show Loaded") { state = .loaded(["SwiftUI Tips", "Combine Guide", "Core Data Deep Dive"]) }
                Button("Show Empty") { state = .empty }
                Button("Show Error") { state = .error("Could not connect to the server. Check your internet connection and try again.") }
            }
        }
        .task { loadArticles() }
    }

    private func loadArticles() {
        state = .loading
        // Simulate network delay
        Task {
            try? await Task.sleep(for: .seconds(1))
            state = .loaded(["SwiftUI Tips", "Combine Guide", "Core Data Deep Dive"])
        }
    }
}

#Preview("Loaded") {
    NavigationStack {
        ArticleListView()
    }
}
```
