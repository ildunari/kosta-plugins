import Foundation

public final class WebSocketClient: NSObject {
    private var task: URLSessionWebSocketTask?
    private var session: URLSession!
    private let url: URL
    private var isActive = false

    public init(url: URL) {
        self.url = url
        super.init()
        self.session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
    }

    public func connect() {
        guard task == nil else { return }
        task = session.webSocketTask(with: url)
        isActive = true
        task?.resume()
        listen()
        ping()
    }

    public func send(text: String) async throws {
        try await task?.send(.string(text))
    }

    public func disconnect() {
        isActive = false
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    private func listen() {
        task?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let msg):
                switch msg {
                case .string(let s): print("🔵 <-", s)
                case .data(let d): print("🔵 <-", d.count, "bytes")
                @unknown default: break
                }
                if self.isActive { self.listen() }
            case .failure(let e):
                print("WebSocket error:", e)
                self.reconnect()
            }
        }
    }

    private func ping() {
        Task.detached { [weak self] in
            guard let self else { return }
            while self.isActive {
                try? await Task.sleep(nanoseconds: 15 * 1_000_000_000)
                do { try await self.task?.send(.ping(Data())) } catch { self.reconnect() }
            }
        }
    }

    private func reconnect() {
        guard isActive else { return }
        disconnect()
        Task { [weak self] in
            try? await Task.sleep(nanoseconds: 2 * 1_000_000_000)
            self?.connect()
        }
    }
}

extension WebSocketClient: URLSessionWebSocketDelegate {}
