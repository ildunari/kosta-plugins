import Foundation
import UserNotifications
import UIKit

final class NotificationsManager: NSObject, UNUserNotificationCenterDelegate {
    func requestAuthorization() async throws {
        let center = UNUserNotificationCenter.current()
        let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
        if granted {
            await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
        }
        center.delegate = self
        registerCategories()
    }

    private func registerCategories() {
        let done = UNNotificationAction(identifier: "DONE", title: "Done", options: [.foreground])
        let snooze = UNNotificationAction(identifier: "SNOOZE", title: "Snooze", options: [])
        let cat = UNNotificationCategory(identifier: "TASK", actions: [done, snooze], intentIdentifiers: [], options: [])
        UNUserNotificationCenter.current().setNotificationCategories([cat])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        switch response.actionIdentifier {
        case "DONE": print("Mark task done")
        case "SNOOZE": print("Snoozed")
        default: break
        }
    }
}
