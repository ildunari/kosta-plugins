import SwiftUI
import ComposableArchitecture

@Reducer
struct ProfileFeature {
    @ObservableState
    struct State: Equatable { var name = "..." }
    enum Action { case onAppear, nameLoaded(String) }
    @Dependency(\.continuousClock) var clock
    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .onAppear:
                return .run { send in
                    try await clock.sleep(for: .milliseconds(1)) // placeholder
                    await send(.nameLoaded("Taylor"))
                }
            case let .nameLoaded(name):
                state.name = name; return .none
            }
        }
    }
}

struct ProfileView: View {
    let store: StoreOf<ProfileFeature>
    var body: some View {
        WithViewStore(store, observe: { $0 }) { vs in
            Text(vs.name).onAppear { vs.send(.onAppear) }
        }
    }
}