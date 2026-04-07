
#!/usr/bin/env python3
"""
boilerplate_generator.py
Generate minimal, working folder structures and starter Swift files for MVVM, TCA, Clean, and VIPER.
"""
import os, argparse, textwrap

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

MVVM_VIEW = """import SwiftUI

final class CounterViewModel: ObservableObject {
    @Published var count: Int = 0
    func increment() { count += 1 }
    func decrement() { count -= 1 }
}

struct CounterView: View {
    @StateObject var vm = CounterViewModel()
    var body: some View {
        VStack {
            Text("Count: \\(vm.count)")
            HStack {
                Button("-") { vm.decrement() }
                Button("+") { vm.increment() }
            }
        }.padding()
    }
}
"""

TCA_FEATURE = """import SwiftUI
import ComposableArchitecture

@Reducer
struct CounterFeature {
    @ObservableState
    struct State: Equatable { var count = 0 }
    enum Action { case increment, decrement }
    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .increment:
                state.count += 1
                return .none
            case .decrement:
                state.count -= 1
                return .none
            }
        }
    }
}

struct CounterView: View {
    let store: StoreOf<CounterFeature>
    var body: some View {
        WithViewStore(store, observe: { $0 }) { viewStore in
            VStack {
                Text("Count: \\(viewStore.count)")
                HStack {
                    Button("-") { viewStore.send(.decrement) }
                    Button("+") { viewStore.send(.increment) }
                }
            }.padding()
        }
    }
}
"""

CLEAN_FILES = {
"Domain/Entities/Counter.swift": """public struct Counter { public var value: Int = 0 }""",
"Domain/UseCases/IncrementCounter.swift": """public protocol CounterRepository { func current() -> Counter; func save(_ c: Counter) }
public struct IncrementCounterUseCase {
    public init(repo: CounterRepository) { self.repo = repo }
    let repo: CounterRepository
    public func execute() {
        var c = repo.current(); c.value += 1; repo.save(c)
    }
}""",
"Data/RepositoryImpl/CounterRepositoryImpl.swift": """import Foundation
public final class CounterRepositoryImpl: CounterRepository {
    private var storage = Counter()
    public init() {}
    public func current() -> Counter { storage }
    public func save(_ c: Counter) { storage = c }
}""",
"Presentation/ViewModels/CounterViewModel.swift": """import Foundation
public final class CounterViewModel: ObservableObject {
    @Published public private(set) var value: Int = 0
    let inc: IncrementCounterUseCase
    let repo: CounterRepository
    public init(inc: IncrementCounterUseCase, repo: CounterRepository) { self.inc = inc; self.repo = repo; value = repo.current().value }
    public func increment() { inc.execute(); value = repo.current().value }
}""",
"Presentation/Views/CounterView.swift": """import SwiftUI
public struct CounterView: View {
    @StateObject var vm: CounterViewModel
    public init(vm: CounterViewModel) { _vm = StateObject(wrappedValue: vm) }
    public var body: some View {
        VStack {
            Text("Count: \\(vm.value)")
            Button("+") { vm.increment() }
        }.padding()
    }
}"""
}

VIPER_FILES = {
"Counter/Entity/Counter.swift": "struct Counter { var value = 0 }",
"Counter/Interactor/CounterInteractor.swift": """protocol CounterInteractorProtocol { func increment() -> Int }
final class CounterInteractor: CounterInteractorProtocol {
    private var counter = Counter()
    func increment() -> Int { counter.value += 1; return counter.value }
}""",
"Counter/Presenter/CounterPresenter.swift": """protocol CounterViewProtocol: AnyObject { func update(count: Int) }
protocol CounterPresenterProtocol { func didTapIncrement() }
final class CounterPresenter: CounterPresenterProtocol {
    weak var view: CounterViewProtocol?
    var interactor: CounterInteractorProtocol!
    func didTapIncrement() { let v = interactor.increment(); view?.update(count: v) }
}""",
"Counter/Router/CounterRouter.swift": """import UIKit
final class CounterRouter {
    static func build() -> UIViewController {
        let v = CounterViewController()
        let p = CounterPresenter()
        let i = CounterInteractor()
        p.view = v; p.interactor = i; v.presenter = p
        return v
    }
}""",
"Counter/View/CounterView.swift": """import UIKit
final class CounterViewController: UIViewController, CounterViewProtocol {
    var presenter: CounterPresenterProtocol!
    private let label = UILabel()
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = False
    }
    func update(count: Int) { label.text = "Count: \\(count)" }
}""".replace("False", "false")
}

def scaffold_mvvm(into):
    write(os.path.join(into, "View/CounterView.swift"), MVVM_VIEW)

def scaffold_tca(into):
    write(os.path.join(into, "Feature/CounterFeature.swift"), TCA_FEATURE)

def scaffold_clean(into):
    for rel, content in CLEAN_FILES.items():
        write(os.path.join(into, rel), content)

def scaffold_viper(into):
    for rel, content in VIPER_FILES.items():
        write(os.path.join(into, rel), content)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arch", choices=["mvvm", "tca", "clean", "viper"], required=True)
    ap.add_argument("--name", default="Counter")
    ap.add_argument("--into", default="./Generated")
    args = ap.parse_args()

    target = os.path.join(args.into, args.name + "-" + args.arch.upper())
    os.makedirs(target, exist_ok=True)

    if args.arch == "mvvm": scaffold_mvvm(target)
    elif args.arch == "tca": scaffold_tca(target)
    elif args.arch == "clean": scaffold_clean(target)
    elif args.arch == "viper": scaffold_viper(target)

    print(f"Scaffolded {args.arch} into {target}")

if __name__ == "__main__":
    main()
