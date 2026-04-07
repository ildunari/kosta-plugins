import UIKit

// MARK: - VIPER Contracts
protocol TodoViewProtocol: AnyObject { func display(items: [String]) }
protocol TodoPresenterProtocol: AnyObject {
    func viewDidLoad()
    func addItem(_ text: String)
}
protocol TodoInteractorProtocol: AnyObject {
    func load() -> [String]
    func add(_ text: String) -> [String]
}
protocol TodoRouterProtocol: AnyObject { static func assemble() -> UIViewController }

// MARK: - VIPER Implementations
final class TodoInteractor: TodoInteractorProtocol {
    private var items: [String] = []
    func load() -> [String] { items }
    func add(_ text: String) -> [String] { items.append(text); return items }
}

final class TodoPresenter: TodoPresenterProtocol {
    weak var view: TodoViewProtocol?
    var interactor: TodoInteractorProtocol!
    func viewDidLoad() { view?.display(items: interactor.load()) }
    func addItem(_ text: String) { view?.display(items: interactor.add(text)) }
}

final class TodoRouter: TodoRouterProtocol {
    static func assemble() -> UIViewController {
        let v = TodoViewController()
        let i = TodoInteractor()
        let p = TodoPresenter()
        p.interactor = i; p.view = v; v.presenter = p
        return v
    }
}

final class TodoViewController: UIViewController, TodoViewProtocol {
    var presenter: TodoPresenterProtocol!
    private let field = UITextField()
    private let table = UITableView()
    private var data: [String] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        field.placeholder = "New item"
        field.borderStyle = .roundedRect
        field.translatesAutoresizingMaskIntoConstraints = false
        table.translatesAutoresizingMaskIntoConstraints = false
        let add = UIButton(type: .system); add.setTitle("Add", for: .normal)
        add.addTarget(self, action: #selector(onAdd), for: .touchUpInside)
        add.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(field); view.addSubview(add); view.addSubview(table)
        NSLayoutConstraint.activate([
            field.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            field.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            add.leadingAnchor.constraint(equalTo: field.trailingAnchor, constant: 8),
            add.centerYAnchor.constraint(equalTo: field.centerYAnchor),
            add.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            table.topAnchor.constraint(equalTo: field.bottomAnchor, constant: 16),
            table.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            table.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            table.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        table.dataSource = self
        presenter.viewDidLoad()
    }

    @objc private func onAdd() {
        presenter.addItem(field.text ?? "")
        field.text = ""
    }

    func display(items: [String]) { data = items; table.reloadData() }
}
extension TodoViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { data.count }
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .default, reuseIdentifier: "c"); cell.textLabel?.text = data[indexPath.row]; return cell
    }
}
