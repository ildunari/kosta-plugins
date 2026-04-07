import SwiftUI
import ComposableArchitecture
// TCA Counter + Todos Mini-App

@Reducer
struct TodosFeature {
    @ObservableState
    struct State: Equatable { var todos: [String] = []; var draft = "" }
    enum Action { case setDraft(String), add, remove(IndexSet) }
    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case let .setDraft(text):
                state.draft = text; return .none
            case .add:
                guard !state.draft.isEmpty else { return .none }
                state.todos.append(state.draft); state.draft = ""; return .none
            case let .remove(indexSet):
                state.todos.remove(atOffsets: indexSet); return .none
            }
        }
    }
}

@main
struct TCAApp: App {
    let store = Store(initialState: TodosFeature.State()) { TodosFeature() }
    var body: some Scene {
        WindowGroup { TodosView(store: store) }
    }
}

struct TodosView: View {
    let store: StoreOf<TodosFeature>
    var body: some View {
        WithViewStore(store, observe: { $0 }) { vs in
            VStack {
                HStack {
                    TextField("Draft", text: vs.binding(get: \.$draft, send: { .setDraft($0) }))
                    Button("Add") { vs.send(.add) }
                }.padding()
                List {
                    ForEach(Array(vs.todos.enumerated()), id: \.0) { idx, item in
                        Text(item)
                    }.onDelete { vs.send(.remove($0)) }
                }
            }.padding()
        }
    }
}
