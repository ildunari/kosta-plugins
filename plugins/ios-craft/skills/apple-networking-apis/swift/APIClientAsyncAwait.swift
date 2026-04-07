import Foundation

public struct APIRequest<B: Encodable> {
    public var method: String
    public var path: String
    public var body: B?
    public var headers: [String:String] = [:]
    public var query: [String:String?] = [:]
    public init(method: String, path: String, body: B? = nil) {
        self.method = method; self.path = path; self.body = body
    }
}

public final class APIClient {
    public let baseURL: URL
    public let session: URLSession
    public var defaultHeaders: [String:String] = ["Accept":"application/json"]
    public var jsonDecoder = JSONDecoder()
    public var jsonEncoder = JSONEncoder()
    public var authHeaderProvider: (() async -> String?)?

    public init(baseURL: URL, configuration: URLSessionConfiguration = .default) {
        self.baseURL = baseURL
        self.session = URLSession(configuration: configuration)
        jsonDecoder.dateDecodingStrategy = .iso8601
        jsonEncoder.dateEncodingStrategy = .iso8601
    }

    public func send<T: Decodable, B: Encodable>(_ req: APIRequest<B>, expect: T.Type = T.self) async throws -> T {
        var comps = URLComponents(url: baseURL.appendingPathComponent(req.path), resolvingAgainstBaseURL: false)!
        if !req.query.isEmpty {
            comps.queryItems = req.query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        var urlReq = URLRequest(url: comps.url!)
        urlReq.httpMethod = req.method
        var headers = defaultHeaders.merging(req.headers) { _, r in r }
        if let auth = await authHeaderProvider?() {
            headers["Authorization"] = auth
        }
        for (k,v) in headers { urlReq.setValue(v, forHTTPHeaderField: k) }
        if let body = req.body {
            urlReq.httpBody = try jsonEncoder.encode(body)
            urlReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (data, resp) = try await session.data(for: urlReq)
        guard let http = resp as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        if (200..<300).contains(http.statusCode) {
            return try jsonDecoder.decode(T.self, from: data)
        } else {
            throw URLError(.badServerResponse)
        }
    }
}
