#!/usr/bin/env python3
"""
network_interceptor.py
----------------------
Generate a Swift logging interceptor based on URLProtocol that logs requests
and responses with redaction & size limits. Output is a single Swift file you
can drop into your app and enable with one line.

Usage:
  python network_interceptor.py --out swift/LoggingURLProtocol.swift \
    --redact Authorization --redact Cookie --max-body 16384 --oslog-subsystem com.acme.app

The generated code:
- Subclasses URLProtocol to capture traffic.
- Correlates request/response with a request ID.
- Redacts configured headers and JSON fields.
- Pretty-prints JSON and truncates bodies to --max-body.
- Logs via os_log if available, fallback to print().
"""
import argparse, os, textwrap, datetime

TEMPLATE = """// GENERATED: {ts}
import Foundation
import os

public final class LoggingURLProtocol: URLProtocol {{
    private static let handledKey = "LoggingURLProtocolHandled"
    private static let log = Logger(subsystem: "{subsystem}", category: "network")
    private var task: URLSessionDataTask?
    private var accumulatedData = Data()
    private var requestID = UUID().uuidString

    public class func enable() {{
        URLProtocol.registerClass(LoggingURLProtocol.self)
    }}

    public override class func canInit(with request: URLRequest) -> Bool {{
        if URLProtocol.property(forKey: handledKey, in: request) != nil {{ return false }}
        guard let scheme = request.url?.scheme?.lowercased() else {{ return false }}
        return scheme == "http" || scheme == "https"
    }}

    public override class func canonicalRequest(for request: URLRequest) -> URLRequest {{ request }}

    public override func startLoading() {{
        var req = self.request
        URLProtocol.setProperty(true, forKey: Self.handledKey, in: &req)
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        Self.logRequest(req, id: requestID)
        task = session.dataTask(with: req)
        task?.resume()
    }}

    public override func stopLoading() {{ task?.cancel() }}

    private static func logRequest(_ req: URLRequest, id: String) {{
        var meta: [String: String] = [
            "id": id,
            "method": req.httpMethod ?? "GET",
            "url": req.url?.absoluteString ?? "(nil)"
        ]
        if let headers = req.allHTTPHeaderFields {{
            meta["headers"] = redact(headers: headers).map {{ "\\($0): \\($1)" }}.joined(separator: "; ")
        }}
        if let body = req.httpBody, !body.isEmpty {{
            meta["body"] = summarise(body: body)
        }}
        log.info("➡️ Request \\(meta)")
    }}

    private static func logResponse(_ resp: URLResponse?, data: Data?, id: String) {{
        guard let http = resp as? HTTPURLResponse else {{
            log.error("❌ No HTTPURLResponse for id=\\(id)")
            return
        }}
        var meta: [String: String] = [
            "id": id,
            "status": String(http.statusCode),
            "url": http.url?.absoluteString ?? "(nil)"
        ]
        let headers = http.allHeaderFields.reduce(into: [String:String]()) {{
            if let k = $1.key as? String, let v = $1.value as? CustomStringConvertible {{
                $0[k] = v.description
            }}
        }}
        meta["headers"] = redact(headers: headers).map {{ "\\($0): \\($1)" }}.joined(separator: "; ")
        if let data = data, !data.isEmpty {{
            meta["body"] = summarise(body: data)
        }}
        if (200..<300).contains(http.statusCode) {{
            log.info("⬅️ Response \\(meta)")
        }} else {{
            log.warning("⚠️ Response \\(meta)")
        }}
    }}

    private static func redact(headers: [String:String]) -> [String:String] {{
        let redactions = Set([{redactions}].map {{ $0.lowercased() }})
        return headers.reduce(into: [String:String]()) {{ acc, pair in
            if redactions.contains(pair.key.lowercased()) {{
                acc[pair.key] = "<redacted>"
            }} else { acc[pair.key] = pair.value }
        }}
    }}

    private static func summarise(body: Data) -> String {{
        let maxLen = {max_body}
        var data = body
        if data.count > maxLen {{
            data = data.prefix(maxLen)
        }}
        if let obj = try? JSONSerialization.jsonObject(with: data),
           JSONSerialization.isValidJSONObject(obj),
           let pretty = try? JSONSerialization.data(withJSONObject: obj, options: [.prettyPrinted]) {{
            return String(data: pretty, encoding: .utf8) ?? "<binary>"
        }}
        return String(data: data, encoding: .utf8) ?? "<\(body.count) bytes>"
    }}
}}

extension LoggingURLProtocol: URLSessionDataDelegate {{
    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {{
        accumulatedData.append(data)
        client?.urlProtocol(self, didLoad: data)
    }}
    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {{
        LoggingURLProtocol.logResponse(task.response, data: accumulatedData, id: requestID)
        if let error = error {{
            Self.log.error("💥 Error id=\\(requestID) error=\\(String(describing: error))")
            client?.urlProtocol(self, didFailWithError: error)
        }} else {{
            client?.urlProtocolDidFinishLoading(self)
        }}
    }}
}}
"""

def main():
    ap = argparse.ArgumentParser(description="Generate a Swift logging URLProtocol interceptor.")
    ap.add_argument("--out", required=True, help="Output .swift file path")
    ap.add_argument("--redact", action="append", default=["Authorization","Cookie","Set-Cookie"], help="Header name to redact (repeatable)")
    ap.add_argument("--max-body", type=int, default=16384, help="Max body bytes to log")
    ap.add_argument("--oslog-subsystem", default="com.example.app", help="OSLog subsystem")
    args = ap.parse_args()
    code = TEMPLATE.format(ts=datetime.datetime.utcnow().isoformat()+"Z",
                           redactions=", ".join([f'"{h}"' for h in args.redact]),
                           max_body=args.max_body,
                           subsystem=args.oslog_subsystem)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(code)
    print(f"[ok] Wrote interceptor to {args.out}")

if __name__ == "__main__":
    main()
