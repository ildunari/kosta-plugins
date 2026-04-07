import Foundation

public struct Multipart {
    public let boundary: String = "Boundary-\(UUID().uuidString)"
    private var parts: [Data] = []

    public mutating func add(field name: String, value: String) {
        var d = Data()
        d.append("--\(boundary)\r\n".data(using: .utf8)!)
        d.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
        d.append("\(value)\r\n".data(using: .utf8)!)
        parts.append(d)
    }

    public mutating func add(file name: String, filename: String, mime: String, data: Data) {
        var d = Data()
        d.append("--\(boundary)\r\n".data(using: .utf8)!)
        d.append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        d.append("Content-Type: \(mime)\r\n\r\n".data(using: .utf8)!)
        d.append(data)
        d.append("\r\n".data(using: .utf8)!)
        parts.append(d)
    }

    public func body() -> Data {
        var d = Data()
        for p in parts { d.append(p) }
        d.append("--\(boundary)--\r\n".data(using: .utf8)!)
        return d
    }
}

public extension URLRequest {
    mutating func setMultipart(_ m: Multipart) {
        self.setValue("multipart/form-data; boundary=\(m.boundary)", forHTTPHeaderField: "Content-Type")
        self.httpBody = m.body()
    }
}
