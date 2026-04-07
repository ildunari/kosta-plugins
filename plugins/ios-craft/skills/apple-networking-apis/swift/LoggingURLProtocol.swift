import Foundation

public final class SimpleLoggingURLProtocol: URLProtocol {
    private static let key = "SimpleLoggingHandled"
    private var task: URLSessionDataTask?
    public class func enable() { URLProtocol.registerClass(SimpleLoggingURLProtocol.self) }
    public override class func canInit(with request: URLRequest) -> Bool {
        if URLProtocol.property(forKey: key, in: request) != nil { return false }
        guard let scheme = request.url?.scheme else { return false }
        return ["http","https"].contains(scheme)
    }
    public override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    public override func startLoading() {
        var req = request
        URLProtocol.setProperty(true, forKey: Self.key, in: &req)
        task = URLSession.shared.dataTask(with: req) { data, resp, err in
            print("➡️", req.httpMethod ?? "GET", req.url?.absoluteString ?? "")
            if let http = resp as? HTTPURLResponse { print("⬅️", http.statusCode) }
            if let data = data, let str = String(data: data, encoding: .utf8) { print("📦", String(str.prefix(200))) }
            if let resp = resp { self.client?.urlProtocol(self, didReceive: resp, cacheStoragePolicy: .notAllowed) }
            if let data = data { self.client?.urlProtocol(self, didLoad: data) }
            if let err = err { self.client?.urlProtocol(self, didFailWithError: err) }
            self.client?.urlProtocolDidFinishLoading(self)
        }
        task?.resume()
    }
    public override func stopLoading() { task?.cancel() }
}
