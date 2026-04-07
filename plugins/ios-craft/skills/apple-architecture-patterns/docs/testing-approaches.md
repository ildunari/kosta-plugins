# Testing Approaches

| Layer/Pattern | Unit | Integration | UI/Snapshot |
|---|---|---|---|
| MVVM | ViewModel | Service + VM | SwiftUI snapshot |
| TCA | Reducer + Effects | Composed features | Snapshot |
| Clean | UseCase | Repo + Data | Thin UI |
| VIPER | Presenter + Interactor | Module wiring | UI tests |
