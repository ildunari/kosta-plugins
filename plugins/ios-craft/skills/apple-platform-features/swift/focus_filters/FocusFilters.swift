import AppIntents

struct ExampleFocusFilterIntent: SetFocusFilterIntent {
    static var title: LocalizedStringResource = "Example Focus Filter"
    static var description = IntentDescription("Hide work projects when Personal Focus is on.")

    @Parameter(title: "Hide Work Projects") var hideWork: Bool

    static var parameterSummary: some ParameterSummary {
        Summary("Hide work: \(\$hideWork)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<Bool> {
        // Persist preference and notify app
        return .result(value: hideWork)
    }
}
