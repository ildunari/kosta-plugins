import Foundation

public enum NetworkError: Error, CustomStringConvertible {
    case transport(URLError)
    case http(status: Int, data: Data?)
    case decoding(Error)
    case cancelled
    case unauthorized
    case unknown(Error)

    public var description: String {
        switch self {
        case .transport(let e): return "transport: \(e)"
        case .http(let s, _): return "http \(s)"
        case .decoding(let e): return "decoding: \(e)"
        case .cancelled: return "cancelled"
        case .unauthorized: return "unauthorized"
        case .unknown(let e): return "unknown: \(e)"
        }
    }

    public static func map(_ err: Error) -> NetworkError {
        if let url = err as? URLError {
            if url.code == .cancelled { return .cancelled }
            return .transport(url)
        }
        if (err as NSError).domain == NSCocoaErrorDomain { return .decoding(err) }
        return .unknown(err)
    }
}
