import SwiftUI
@main
struct CleanApp: App {
    var body: some Scene {
        WindowGroup {
            let repo = InMemoryTaskRepository()
            let add = AddTaskUseCase(repo: repo)
            let toggle = ToggleTaskUseCase(repo: repo)
            TaskListView(vm: TaskListViewModel(add: add, toggle: toggle, repo: repo))
        }
    }
}