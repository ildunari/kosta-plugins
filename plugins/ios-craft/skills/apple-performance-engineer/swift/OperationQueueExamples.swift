
import Foundation

final class DownloadOp: Operation {
    private let url: URL
    var out: Data?

    init(url: URL) { self.url = url; super.init(); qualityOfService = .userInitiated }

    override func main() {
        if isCancelled { return }
        out = try? Data(contentsOf: url)
    }
}

final class ParseOp: Operation {
    var input: Data?
    var result: [String: Any]?
    override func main() {
        if isCancelled { return }
        guard let input else { return }
        result = (try? JSONSerialization.jsonObject(with: input)) as? [String:Any]
    }
}

final class Pipeline {
    let q: OperationQueue = { let q = OperationQueue(); q.maxConcurrentOperationCount = 4; return q }()

    func run(url: URL, completion: @escaping ([String:Any]?) -> Void) {
        let dl = DownloadOp(url: url)
        let parse = ParseOp()
        parse.addDependency(dl)

        let link = BlockOperation { parse.input = dl.out }
        parse.addDependency(link)

        let done = BlockOperation { completion(parse.result) }
        done.addDependency(parse)

        q.addOperations([dl, parse, link, done], waitUntilFinished: false)
    }
}
