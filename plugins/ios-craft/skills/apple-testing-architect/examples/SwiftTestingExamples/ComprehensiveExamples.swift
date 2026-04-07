import Testing
@testable import MyApp

// MARK: - Swift Testing Examples
// Xcode 16+, Swift 6.0+
// Last Updated: 2025-10-28

// MARK: - Basic Tests

@Test("addition works correctly")
func basicAddition() {
    #expect(2 + 2 == 4)
}

@Test("string contains substring")
func stringContains() {
    let text = "Hello, World!"
    #expect(text.contains("World"))
}

// MARK: - Test Suite Organization

@Suite("User validation tests")
struct UserValidationTests {
    
    @Test("validates valid email format")
    func validEmail() {
        let validator = EmailValidator()
        #expect(validator.isValid("user@example.com"))
    }
    
    @Test("rejects invalid email format")
    func invalidEmail() {
        let validator = EmailValidator()
        #expect(!validator.isValid("invalid.email"))
    }
    
    @Test("validates password strength")
    func passwordStrength() {
        let validator = PasswordValidator()
        #expect(validator.strength("StrongPass123!") == .strong)
    }
}

// MARK: - Async Tests

@Suite("API service tests")
struct APIServiceTests {
    
    @Test("fetches user successfully")
    func fetchUser() async throws {
        let service = APIService()
        let user = try await service.fetchUser(id: "123")
        
        #expect(user.id == "123")
        #expect(user.name.isEmpty == false)
    }
    
    @Test("handles network timeout")
    func networkTimeout() async throws {
        let service = APIService(timeout: 0.001)
        
        await #expect(throws: NetworkError.timeout) {
            try await service.fetchUser(id: "123")
        }
    }
}

// MARK: - Parameterized Tests

@Suite("Mathematical operations")
struct MathTests {
    
    @Test("validates even numbers", arguments: [0, 2, 4, 6, 8, 10, 100])
    func isEven(_ number: Int) {
        #expect(number % 2 == 0)
    }
    
    @Test(
        "validates email formats",
        arguments: [
            ("user@example.com", true),
            ("test@test.co.uk", true),
            ("invalid.email", false),
            ("@example.com", false),
            ("user@", false),
        ]
    )
    func emailFormat(email: String, shouldBeValid: Bool) {
        let validator = EmailValidator()
        #expect(validator.isValid(email) == shouldBeValid)
    }
    
    // Zip multiple argument lists
    @Test(arguments: zip(["Alice", "Bob", "Charlie"], [25, 30, 35]))
    func ageValidation(name: String, age: Int) {
        let person = Person(name: name, age: age)
        #expect(person.isAdult == (age >= 18))
    }
}

// MARK: - Tags for Organization

extension Tag {
    @Tag static var critical: Self
    @Tag static var integration: Self
    @Tag static var slow: Self
    @Tag static var unit: Self
}

@Suite("Payment processing")
struct PaymentTests {
    
    @Test("processes credit card payment", .tags(.critical, .integration))
    func creditCardPayment() async throws {
        let processor = PaymentProcessor()
        let result = try await processor.charge(
            amount: 99.99,
            card: .testCard
        )
        
        #expect(result.success)
        #expect(result.transactionId.isEmpty == false)
    }
    
    @Test("handles declined card", .tags(.integration))
    func declinedCard() async throws {
        let processor = PaymentProcessor()
        
        await #expect(throws: PaymentError.declined) {
            try await processor.charge(
                amount: 99.99,
                card: .declinedCard
            )
        }
    }
    
    @Test("validates amount limits", .tags(.unit))
    func amountLimits() {
        let processor = PaymentProcessor()
        
        #expect(throws: PaymentError.amountTooLow) {
            try processor.validateAmount(0.01)
        }
        
        #expect(throws: PaymentError.amountTooHigh) {
            try processor.validateAmount(100000.00)
        }
    }
}

// MARK: - Traits (Test Configuration)

@Suite("File operations")
struct FileOperationTests {
    
    @Test("uploads large file", .timeLimit(.minutes(5)), .tags(.slow))
    func largeFileUpload() async throws {
        let uploader = FileUploader()
        let result = try await uploader.upload(
            file: .largTestFile
        )
        
        #expect(result.success)
    }
    
    @Test(
        "processes on main thread",
        .serialized  // Not parallel
    )
    func mainThreadOperation() {
        #expect(Thread.isMainThread)
        // Do work that requires main thread
    }
    
    @Test(
        "premium feature access",
        .enabled(if: FeatureFlags.isPremiumEnabled)
    )
    func premiumFeature() {
        let service = PremiumService()
        #expect(service.isAvailable)
    }
}

// MARK: - Confirmations (Async Callbacks)

@Suite("Notification handling")
struct NotificationTests {
    
    @Test("receives notification")
    func notificationFires() async {
        await confirmation("notification received") { confirm in
            NotificationCenter.default.addObserver(
                forName: .dataUpdated,
                object: nil,
                queue: nil
            ) { _ in
                confirm()
            }
            
            DataStore.shared.update()
        }
    }
    
    // Swift 6.1+ - Ranged confirmations
    @Test("callback called multiple times")
    func multipleCallbacks() async {
        await confirmation(expectedCount: 3) { confirm in
            let publisher = DataPublisher()
            
            publisher.onValue = { _ in
                confirm()  // Must be called exactly 3 times
            }
            
            await publisher.publish([1, 2, 3])
        }
    }
}

// MARK: - Require (Stop on Failure)

@Suite("User data processing")
struct UserDataTests {
    
    @Test("processes user data")
    func processUserData() async throws {
        let service = UserService()
        
        // Stop test if user can't be fetched
        let user = try await #require(await service.fetchUser(id: "123"))
        
        // Continue with valid user
        let processed = try process(user)
        #expect(processed.isComplete)
    }
    
    @Test("validates user session")
    func validateSession() throws {
        let session = Session.current
        
        // Stop if no valid token
        let token = try #require(session.token)
        
        #expect(token.isValid)
        #expect(token.expiresAt > Date())
    }
}

// MARK: - Error Handling

@Suite("Error scenarios")
struct ErrorTests {
    
    @Test("throws validation error")
    func throwsError() {
        #expect(throws: ValidationError.self) {
            try validateInput("invalid")
        }
    }
    
    @Test("throws specific error case")
    func specificError() {
        await #expect(throws: NetworkError.timeout) {
            try await makeRequestWithTimeout(0.001)
        }
    }
    
    @Test("does not throw")
    func noError() throws {
        // Just call directly, no special syntax needed
        try validateInput("valid")
    }
}

// MARK: - Setup and Teardown

@Suite("Database tests")
struct DatabaseTests {
    let database: Database
    
    // init runs before each test
    init() {
        database = Database.testInstance()
        database.insertTestData()
    }
    
    // deinit runs after each test
    deinit {
        database.cleanup()
    }
    
    @Test("queries user data")
    func queryUsers() {
        let users = database.fetchUsers()
        #expect(users.count > 0)
    }
    
    @Test("inserts new user")
    func insertUser() throws {
        let user = User(name: "Test", email: "test@example.com")
        try database.insert(user)
        
        let fetched = try database.fetchUser(id: user.id)
        #expect(fetched.name == "Test")
    }
}

// MARK: - Nested Suites

@Suite("E-commerce features")
struct EcommerceTests {
    
    @Suite("Shopping cart")
    struct CartTests {
        
        @Test("adds item to cart")
        func addItem() {
            let cart = ShoppingCart()
            cart.add(item: .testProduct)
            
            #expect(cart.items.count == 1)
        }
        
        @Test("calculates total")
        func calculateTotal() {
            let cart = ShoppingCart()
            cart.add(item: Product(price: 10.00))
            cart.add(item: Product(price: 20.00))
            
            #expect(cart.total == 30.00)
        }
    }
    
    @Suite("Checkout")
    struct CheckoutTests {
        
        @Test("validates payment")
        func validatePayment() async throws {
            let checkout = CheckoutService()
            let result = try await checkout.validatePayment()
            
            #expect(result.isValid)
        }
        
        @Test("creates order")
        func createOrder() async throws {
            let checkout = CheckoutService()
            let order = try await checkout.createOrder()
            
            #expect(order.status == .pending)
        }
    }
}

// MARK: - Best Practices Examples

@Suite("Best practices")
struct BestPracticesTests {
    
    // ✅ Descriptive test names
    @Test("validates email format for valid addresses")
    func validEmailFormat() {
        let validator = EmailValidator()
        #expect(validator.isValid("user@example.com"))
    }
    
    // ✅ One assertion per test (when possible)
    @Test("user age is calculated correctly")
    func userAge() {
        let user = User(birthDate: Date(timeIntervalSince1970: 0))
        #expect(user.age > 50)
    }
    
    // ✅ Use #require for prerequisites
    @Test("processes authenticated user")
    func authenticatedUser() async throws {
        let session = try #require(AuthService.currentSession)
        let user = try await fetchUser(session: session)
        #expect(user.isAuthenticated)
    }
    
    // ✅ Parameterize similar tests
    @Test(
        "validates various formats",
        arguments: ["test@test.com", "user@domain.co.uk"]
    )
    func emailVariations(email: String) {
        #expect(EmailValidator().isValid(email))
    }
    
    // ✅ Use tags for organization
    @Test("critical user flow", .tags(.critical))
    func criticalFlow() async throws {
        // Important test
    }
}

// MARK: - Helper Types (for examples)

private struct EmailValidator {
    func isValid(_ email: String) -> Bool {
        email.contains("@") && email.contains(".")
    }
}

private struct PasswordValidator {
    enum Strength {
        case weak, medium, strong
    }
    
    func strength(_ password: String) -> Strength {
        password.count > 12 ? .strong : .weak
    }
}

private struct APIService {
    let timeout: TimeInterval
    
    init(timeout: TimeInterval = 30) {
        self.timeout = timeout
    }
    
    func fetchUser(id: String) async throws -> User {
        // Simulate API call
        try await Task.sleep(for: .seconds(0.1))
        return User(id: id, name: "Test User", age: 30, email: "test@test.com")
    }
}

private struct User {
    let id: String
    let name: String
    let age: Int
    let email: String
    var isAdult: Bool { age >= 18 }
}

private struct Person {
    let name: String
    let age: Int
    var isAdult: Bool { age >= 18 }
}

private enum NetworkError: Error {
    case timeout
}

private enum PaymentError: Error {
    case declined
    case amountTooLow
    case amountTooHigh
}

private enum ValidationError: Error {
    case invalid
}
