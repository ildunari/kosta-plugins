import AppIntents

struct AddTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Task"
    static var description = IntentDescription("Create a task with priority and due date.")

    @Parameter(title: "Title") var titleText: String
    @Parameter(title: "Priority", default: 1) var priority: Int
    @Parameter(title: "Due", default: Date.now.addingTimeInterval(3600)) var due: Date

    static var parameterSummary: some ParameterSummary {
        Summary("Add \(\$titleText) priority \(\$priority) due \(\$due)")
    }

    func perform() async throws -> some IntentResult {
        // Imagine saving to database
        return .result(value: "Task added: \(titleText)")
    }
}
