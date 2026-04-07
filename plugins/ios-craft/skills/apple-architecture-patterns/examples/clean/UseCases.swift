public protocol TaskRepository {
    func load() -> [TaskItem]
    func save(_ tasks: [TaskItem])
}
public struct ToggleTaskUseCase {
    let repo: TaskRepository
    public init(repo: TaskRepository) { self.repo = repo }
    public func execute(id: String) {
        var tasks = repo.load()
        if let i = tasks.firstIndex(where: { $0.id == id }) {
            tasks[i].done.toggle()
        }
        repo.save(tasks)
    }
}
public struct AddTaskUseCase {
    let repo: TaskRepository
    public init(repo: TaskRepository) { self.repo = repo }
    public func execute(title: String) {
        var tasks = repo.load()
        tasks.append(TaskItem(title: title))
        repo.save(tasks)
    }
}