# Case Study: Scrolling Jank

**Symptoms**: 60→40 FPS dips when fast scrolling thumbnails.  
**Method**: Hitches + Time Profiler; Allocations to check image churn. citeturn18search16turn7search1

**Findings**: Full-size image decoding on main; repeated layout for dynamic heights.  
**Fix**: Downsample with Image I/O; enable prefetching; cache heights.  
**Result**: Hitches reduced by 70%; average CPU on main −35%.
