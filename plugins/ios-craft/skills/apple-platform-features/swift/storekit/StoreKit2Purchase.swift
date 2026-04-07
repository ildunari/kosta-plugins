import Foundation
import StoreKit

@MainActor
final class Store: ObservableObject {
    @Published var products: [Product] = []
    @Published var purchasedIDs: Set<String> = []

    func load() async throws {
        products = try await Product.products(for: ["pro_monthly", "pro_yearly"])
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result {
                purchasedIDs.insert(t.productID)
            }
        }
    }

    func buy(_ product: Product) async throws {
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            if case .verified(let transaction) = verification {
                purchasedIDs.insert(transaction.productID)
                await transaction.finish()
            }
        default:
            break
        }
    }
}
