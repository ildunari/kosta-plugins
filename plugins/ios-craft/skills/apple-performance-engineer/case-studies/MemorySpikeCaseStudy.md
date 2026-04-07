# Case Study: Memory Spike After Image Import

**Symptoms**: Peak memory jumps by 300MB during batch import.  
**Method**: Allocations + Memory Graph; verify autorelease growth. citeturn7search1

**Findings**: Loop creates many temporary Foundation objects; pool drained only at runloop boundary.  
**Fix**: Wrap batches in `autoreleasepool {}` and downsample on import. citeturn14search5

**Result**: Peak −58%; no OOMs.
