# Migration Strategies

## MVC → MVVM
- Extract services from controllers behind protocols
- Introduce ViewModels; map controller logic into VM
- Add Coordinators for navigation

## MVVM → TCA
- Choose a leaf feature; define State/Action/Reducer
- Replace VM with Store-bound view
- Centralize side effects as Effects; inject dependencies
- Compose multiple features

## Toward Clean/VIPER
- Define Domain layer with UseCases and Repository protocols
- Move data access to Data layer; keep UI thin
