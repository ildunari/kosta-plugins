
import UIKit

// Cache dynamic row heights to avoid repeated Auto Layout passes on fast scrolls.
final class HeightCache {
    private var map: [IndexPath: CGFloat] = [:]
    subscript(_ indexPath: IndexPath) -> CGFloat? {
        get { map[indexPath] }
        set { map[indexPath] = newValue }
    }
}

final class CachingTableVC: UITableViewController {
    private let heightCache = HeightCache()
    private let reuse = "cell"

    override func viewDidLoad() {
        super.viewDidLoad()
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: reuse)
        tableView.estimatedRowHeight = 64
    }

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        2000
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let c = tableView.dequeueReusableCell(withIdentifier: reuse, for: indexPath)
        c.textLabel?.text = "Row \(indexPath.row) " + String(repeating: "•", count: indexPath.row % 50)
        return c
    }

    override func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        if let h = heightCache[indexPath] { return h }
        // Offscreen sizing
        let sizer = UITableViewCell(style: .default, reuseIdentifier: nil)
        sizer.textLabel?.text = "Row \(indexPath.row) " + String(repeating: "•", count: indexPath.row % 50)
        sizer.bounds = CGRect(x: 0, y: 0, width: tableView.bounds.width, height: .greatestFiniteMagnitude)
        sizer.layoutIfNeeded()
        let h = max(44, sizer.contentView.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize).height)
        heightCache[indexPath] = h
        return h
    }
}
