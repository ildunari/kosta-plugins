
import Foundation

// Demonstrates using QoS and serial/concurrent queues appropriately.
final class WorkScheduler {
    private let ioQueue = DispatchQueue(label: "io.queue", qos: .utility)
    private let cpuQueue = DispatchQueue(label: "cpu.queue", qos: .userInitiated, attributes: .concurrent)

    func loadFiles(urls: [URL], completion: @escaping ([Data]) -> Void) {
        ioQueue.async {
            let result = urls.compactMap { try? Data(contentsOf: $0) }
            completion(result)
        }
    }

    func crunch(numbers: [Int], completion: @escaping (Int) -> Void) {
        cpuQueue.async {
            let sum = numbers.parallelReduce(0, +)
            completion(sum)
        }
    }
}

extension Array where Element == Int {
    func parallelReduce(_ seed: Int, _ f: (Int, Int) -> Int) -> Int {
        let group = DispatchGroup()
        let chunks = stride(from: 0, to: count, by: 10_000).map { idx in
            Array(self[idx..<Swift.min(idx+10_000, count)]) }
        var partials = Array(repeating: 0, count: chunks.count)
        for (i, c) in chunks.enumerated() {
            DispatchQueue.global(qos: .userInitiated).async(group: group) {
                partials[i] = c.reduce(seed, f)
            }
        }
        group.wait()
        return partials.reduce(seed, f)
    }
}
