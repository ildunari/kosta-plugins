import Foundation
import BackgroundTasks

enum BGIdentifiers {
    static let refresh = "com.example.app.refresh"
    static let processing = "com.example.app.processing"
}

func registerBackgroundTasks() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: BGIdentifiers.refresh, using: nil) { task in
        scheduleAppRefresh()
        Task {
            await refreshData()
            task.setTaskCompleted(success: true)
        }
    }

    BGTaskScheduler.shared.register(forTaskWithIdentifier: BGIdentifiers.processing, using: nil) { task in
        scheduleProcessing()
        Task {
            await doProcessingWork()
            task.setTaskCompleted(success: true)
        }
    }
}

func scheduleAppRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: BGIdentifiers.refresh)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
    try? BGTaskScheduler.shared.submit(request)
}

func scheduleProcessing() {
    let request = BGProcessingTaskRequest(identifier: BGIdentifiers.processing)
    request.requiresNetworkConnectivity = true
    request.requiresExternalPower = false
    try? BGTaskScheduler.shared.submit(request)
}

@MainActor
func refreshData() async {
    // Fetch and persist
}

@MainActor
func doProcessingWork() async {
    // Heavy background work
}
