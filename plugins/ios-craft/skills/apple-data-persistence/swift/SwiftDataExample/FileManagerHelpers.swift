import Foundation

public enum AppPaths {
    public static var documents: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    public static var applicationSupport: URL {
        let url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }
    public static var caches: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    }
}

public func excludeFromBackup(_ url: URL) {
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    var copy = url
    try? copy.setResourceValues(values)
}
