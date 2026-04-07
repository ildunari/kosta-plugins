import Foundation

public struct OfflineRequest: Codable {
    public var id: String
    public var method: String
    public var path: String
    public var headers: [String:String]
    public var body: Data?
    public var idempotencyKey: String?
}

public actor OfflineQueue {
    private let url: URL
    private var items: [OfflineRequest] = []

    public init(storageURL: URL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("offline-queue.json")) {
        self.url = storageURL
        self.items = (try? JSONDecoder().decode([OfflineRequest].self, from: Data(contentsOf: storageURL))) ?? []
    }

    public func enqueue(_ r: OfflineRequest) async {
        items.append(r); persist()
    }

    public func drain(using sender: (OfflineRequest) async throws -> Void) async {
        while !items.isEmpty {
            let r = items[0]
            do { try await sender(r); items.removeFirst(); persist() } catch {
                // back off a little, then break to wait for connectivity signal
                try? await Task.sleep(nanoseconds: 2 * 1_000_000_000); break
            }
        }
    }

    private func persist() {
        let data = try? JSONEncoder().encode(items)
        try? data?.write(to: url, options: .atomic)
    }
}
