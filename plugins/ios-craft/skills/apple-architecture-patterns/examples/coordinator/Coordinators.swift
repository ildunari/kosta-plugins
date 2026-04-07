import UIKit

protocol Coordinator: AnyObject {
    var children: [Coordinator] { get set }
    var navigation: UINavigationController { get }
    func start()
}

extension Coordinator {
    func add(_ child: Coordinator) { children.append(child) }
    func remove(_ child: Coordinator) { children.removeAll { $0 === child } }
}

final class AppCoordinator: Coordinator {
    var children: [Coordinator] = []
    let navigation: UINavigationController
    init(window: UIWindow) {
        self.navigation = UINavigationController()
        window.rootViewController = navigation
        window.makeKeyAndVisible()
    }
    func start() {
        let flow = OnboardingCoordinator(navigation: navigation)
        add(flow); flow.start()
    }
}

final class OnboardingCoordinator: Coordinator {
    var children: [Coordinator] = []
    let navigation: UINavigationController
    init(navigation: UINavigationController) { self.navigation = navigation }
    func start() {
        let vc = UIViewController(); vc.view.backgroundColor = .systemBlue
        vc.title = "Welcome"
        navigation.pushViewController(vc, animated: false)
    }
}
