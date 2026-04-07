import SwiftUI
import Combine

struct User: Decodable { let name: String }

protocol UserService { func fetchName() async throws -> String }
struct LiveUserService: UserService {
    func fetchName() async throws -> String {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "https://example.com/user/1")!)
        return String(data: data, encoding: .utf8) ?? "Unknown"
    }
}

final class ProfileViewModel: ObservableObject {
    @Published var name = "..."
    let service: UserService
    init(service: UserService) { self.service = service }
    @MainActor func load() async { self.name = (try? await service.fetchName()) ?? "N/A" }
}

struct ProfileView: View {
    @StateObject var vm: ProfileViewModel
    var body: some View { Text(vm.name).task { await vm.load() } }
}