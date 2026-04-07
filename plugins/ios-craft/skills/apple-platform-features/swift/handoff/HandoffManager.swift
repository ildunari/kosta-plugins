import Foundation
import UIKit

enum Handoff {
    static let activityType = "com.example.app.view-item"

    static func currentActivity(userInfo: [AnyHashable: Any]) -> NSUserActivity {
        let act = NSUserActivity(activityType: activityType)
        act.isEligibleForHandoff = true
        act.userInfo = userInfo
        act.title = "Viewing Item"
        return act
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        if userActivity.activityType == Handoff.activityType {
            // Restore UI from userActivity.userInfo
            print("Continue activity: \(String(describing: userActivity.userInfo))")
        }
    }
}
