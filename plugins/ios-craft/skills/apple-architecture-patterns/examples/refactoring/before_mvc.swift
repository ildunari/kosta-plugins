import UIKit

final class ProfileViewController: UIViewController {
    private var nameLabel = UILabel()
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        // BAD: Networking and parsing in VC
        URLSession.shared.dataTask(with: URL(string: "https://example.com/user/1")!) { data, _, _ in
            guard let d = data, let name = String(data: d, encoding: .utf8) else { return }
            DispatchQueue.main.async { self.nameLabel.text = name }
        }.resume()
    }
}