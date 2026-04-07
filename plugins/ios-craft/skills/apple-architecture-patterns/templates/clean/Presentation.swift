import SwiftUI
public final class TaskListViewModel: ObservableObject {
    @Published public private(set) var items: [TaskItem] = []
    let add: AddTaskUseCase
    let toggle: ToggleTaskUseCase
    let repo: TaskRepository
    public init(add: AddTaskUseCase, toggle: ToggleTaskUseCase, repo: TaskRepository) {
        self.add = add; self.toggle = toggle; self.repo = repo
        items = repo.load()
    }
    public func addTask(title: String) { add.execute(title: title); items = repo.load() }
    public func toggleTask(id: String) { toggle.execute(id: id); items = repo.load() }
}
public struct TaskListView: View {
    @StateObject var vm: TaskListViewModel
    @State private var draft: String = ""
    public init(vm: TaskListViewModel) { _vm = StateObject(wrappedValue: vm) }
    public var body: some View {
        VStack {
            HStack {
                TextField("New task", text: $draft)
                Button("Add") { vm.addTask(title: draft); draft = "" }
            }.padding()
            List {
                ForEach(vm.items) { item in
                    HStack {
                        Text(item.title); Spacer()
                        Button(item.done ? "✓" : "○") { vm.toggleTask(id: item.id) }
                    }
                }
            }
        }.padding()
    }
}