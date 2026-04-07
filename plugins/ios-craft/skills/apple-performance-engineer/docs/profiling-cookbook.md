# Profiling Cookbook

**Symptom**: Scroll jank in a list  
**Do**: Hitches + Time Profiler; check cell layout and image decoding; enable prefetch; downsample images. citeturn18search16turn21search0turn15search8

**Symptom**: Memory spikes on image grid  
**Do**: Allocations; replace full decode with downsample; cache thumbnails. citeturn7search1

**Symptom**: Slow cold start  
**Do**: Launch metrics + signposts; move work off critical path; defer I/O. citeturn12search15

**Symptom**: Battery drain while idle  
**Do**: Power Profiler; throttle timers; batch background work. citeturn7search6
