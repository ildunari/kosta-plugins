import SwiftUI
// MVVM Counter Mini-App

struct Todo: Identifiable { let id = UUID(); var title: String }

final class TodoViewModel: ObservableObject {
    @Published var todos: [Todo] = []
    @Published var newTitle: String = ""
    func add() {
        guard !newTitle.isEmpty else { return }
        todos.append(Todo(title: newTitle))
        newTitle = ""
    }
    func remove(at offsets: IndexSet) {
        todos.remove(atOffsets: offsets)
    }
}

@main
struct MVVMApp: App {
    var body: some Scene { WindowGroup { TodoListView(vm: TodoViewModel()) } }
}

struct TodoListView: View {
    @StateObject var vm: TodoViewModel
    var body: some View {
        NavigationView {
            VStack {
                HStack {
                    TextField("New todo", text: $vm.newTitle)
                    Button("Add") { vm.add() }
                }.padding()
                List {
                    ForEach(vm.todos) { t in Text(t.title) }
                    .onDelete(perform: vm.remove)
                }
            }.navigationTitle("MVVM Todos")
        }
    }
}
