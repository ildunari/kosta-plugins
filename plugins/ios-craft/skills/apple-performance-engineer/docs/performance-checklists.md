# Performance Checklists

## SwiftUI Screen
- [ ] Uses Lazy containers for long lists. citeturn17search1
- [ ] Avoids unnecessary `.id(_:)` resets. citeturn8search10
- [ ] Uses `.equatable()` for heavy subviews. citeturn17search4

## UIKit List
- [ ] Prefetching implemented for images/data. citeturn21search0
- [ ] Height/size caching in hot paths.
- [ ] Images downsampled to display size. citeturn15search8

## Build & Launch
- [ ] Incremental builds (Debug), WMO (Release). citeturn10search16
- [ ] App launch path signposted and measured. citeturn12search2
