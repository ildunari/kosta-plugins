import Foundation
import Network

public final class NetworkMonitor {
    public enum Status { case satisfied, unsatisfied, requiresConnection }
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "net.monitor")
    public private(set) var status: Status = .unsatisfied
    public private(set) var isExpensive: Bool = false
    public init() {
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self else { return }
            self.isExpensive = path.isExpensive
            if path.status == .satisfied { self.status = .satisfied }
            else if path.status == .requiresConnection { self.status = .requiresConnection }
            else { self.status = .unsatisfied }
            print("Path:", self.status, "expensive:", self.isExpensive)
        }
        monitor.start(queue: queue)
    }
    deinit { monitor.cancel() }
}
