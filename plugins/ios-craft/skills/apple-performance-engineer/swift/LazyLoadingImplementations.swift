
import UIKit

final class PrefetchingDataSource: NSObject, UITableViewDataSourcePrefetching {
    private var pending: Set<IndexPath> = []
    let imageLoader = ImageLoader.shared

    func tableView(_ tableView: UITableView, prefetchRowsAt indexPaths: [IndexPath]) {
        for ip in indexPaths where pending.insert(ip).inserted {
            imageLoader.prefetch(id: ip.row)
        }
    }

    func tableView(_ tableView: UITableView, cancelPrefetchingForRowsAt indexPaths: [IndexPath]) {
        for ip in indexPaths {
            pending.remove(ip)
            imageLoader.cancel(id: ip.row)
        }
    }
}

final class ImageLoader {
    static let shared = ImageLoader()
    private let queue = OperationQueue()
    private var ops: [Int: Operation] = [:]

    func prefetch(id: Int) {
        guard ops[id] == nil else { return }
        let op = BlockOperation {
            // Simulate expensive I/O
            Thread.sleep(forTimeInterval: 0.02)
        }
        ops[id] = op
        queue.addOperation(op)
    }

    func cancel(id: Int) { ops[id]?.cancel(); ops[id] = nil }
}
