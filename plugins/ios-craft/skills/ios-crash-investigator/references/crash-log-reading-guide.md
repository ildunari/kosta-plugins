# Crash Log Reading Guide

An annotated example crash log. Every section is explained for someone who has never seen one before.

---

## Full Example (Annotated)

Below is a crash log with numbered callouts. Read the explanations after each section.

```
Incident Identifier:  A1B2C3D4-E5F6-7890-ABCD-EF1234567890    ← [1]
CrashReporter Key:    abc123def456                               ← [2]
Hardware Model:       iPhone15,2                                  ← [3]
Process:              MyApp [12345]                               ← [4]
Path:                 /private/var/.../MyApp.app/MyApp
Identifier:           com.mycompany.myapp                        ← [5]
Version:              2.1.0 (42)                                  ← [6]
Code Type:            ARM-64                                      ← [7]
Role:                 Foreground
Parent Process:       launchd [1]
Coalition:            com.mycompany.myapp [1234]

Date/Time:            2025-03-15 14:23:45.1234 -0700             ← [8]
Launch Time:          2025-03-15 14:20:00.0000 -0700             ← [9]
OS Version:           iPhone OS 18.3 (22D60)                     ← [10]
Release Type:         User
```

### Header Explanations

| Callout | Field | What It Means |
|---|---|---|
| [1] | Incident Identifier | Unique ID for this specific crash. Use it to track a single crash event. |
| [2] | CrashReporter Key | Anonymous device identifier. Same key = same device. Tells you if one user is crashing repeatedly. |
| [3] | Hardware Model | The device model. `iPhone15,2` = iPhone 14 Pro. Useful for device-specific bugs. |
| [4] | Process | Your app name and its process ID (PID). |
| [5] | Identifier | Your app's bundle ID. |
| [6] | Version | Marketing version (2.1.0) and build number (42). Match this to your release. |
| [7] | Code Type | Architecture. ARM-64 for all modern iPhones. |
| [8] | Date/Time | When the crash happened. |
| [9] | Launch Time | When the app was launched. Subtract from Date/Time to see how long the app ran before crashing. Here: ~3.5 minutes. |
| [10] | OS Version | The iOS version. Check if the crash is specific to certain OS versions. |

---

## Exception Section

```
Exception Type:       EXC_CRASH (SIGABRT)                        ← [11]
Exception Codes:      0x0000000000000000, 0x0000000000000000     ← [12]
Exception Note:       EXC_CORPSE_NOTIFY
Triggered by Thread:  0                                           ← [13]

Application Specific Information:                                 ← [14]
Fatal error: Unexpectedly found nil while unwrapping an Optional value
```

### Exception Explanations

| Callout | Field | What It Means |
|---|---|---|
| [11] | Exception Type | **The crash category.** `EXC_CRASH (SIGABRT)` means the app called `abort()` intentionally -- usually a Swift runtime error like force-unwrap failure. `EXC_BAD_ACCESS` means the app tried to read/write invalid memory. |
| [12] | Exception Codes | Memory addresses involved. `0x0000000000000000` (all zeros) often means a nil pointer was dereferenced. |
| [13] | Triggered by Thread | **Which thread crashed.** Thread 0 = main thread (UI). Other threads = background work. |
| [14] | Application Specific Info | **The human-readable error message.** This is often the most useful line in the entire log. Here it says a force-unwrap (`!`) found nil. |

### Common Exception Types

| Exception Type | Plain English |
|---|---|
| `EXC_CRASH (SIGABRT)` | Your code or Swift runtime called abort. Check the "Application Specific Information" for the reason. |
| `EXC_BAD_ACCESS (SIGSEGV)` | Your code tried to use memory it shouldn't. Often a dangling pointer or use-after-free. |
| `EXC_BAD_ACCESS (SIGBUS)` | Your code tried to access misaligned memory. Rare in Swift; more common in C/C++ code. |
| `EXC_BREAKPOINT (SIGTRAP)` | Hit a `fatalError()`, `preconditionFailure()`, or a Swift runtime trap. |
| `EXC_RESOURCE` | App used too much of a resource (memory or CPU). The system killed it proactively. |

---

## Thread Call Stack

```
Thread 0 Crashed:                                                ← [15]
0   libswiftCore.dylib           0x19a2b3c4d  swift_fatalError   ← [16]
1   libswiftCore.dylib           0x19a2b3c00  swift_unexpectedError
2   MyApp                        0x100abc123  ProfileViewModel.loadProfile() + 456   ← [17]
3   MyApp                        0x100abc000  ProfileView.body.getter + 128          ← [18]
4   SwiftUI                      0x1a5678900  ViewGraph.updateValue
5   SwiftUI                      0x1a5678800  ViewGraph.update
6   CoreFoundation               0x189012345  __CFRUNLOOP_IS_CALLING_OUT_TO_A_SOURCE
7   CoreFoundation               0x189012000  __CFRunLoopRun
8   CoreFoundation               0x189011000  CFRunLoopRunSpecific
9   GraphicsServices             0x1c0001234  GSEventRunModal
10  UIKitCore                    0x18f012345  -[UIApplication _run]
11  UIKitCore                    0x18f012000  UIApplicationMain
```

### Call Stack Explanations

| Callout | What It Means |
|---|---|
| [15] | This is the thread that crashed. Read its call stack to find the cause. |
| [16] | The topmost frame -- where execution stopped. This is inside Swift's runtime, which triggered the fatal error. |
| [17] | **Your code.** `ProfileViewModel.loadProfile()` at offset +456 bytes. This is likely where the force-unwrap happened. |
| [18] | **Also your code.** `ProfileView.body` called `loadProfile()`. |

### How to Read the Call Stack

1. **Start from the top** (frame 0) -- this is where the crash happened
2. **Scan down for YOUR code** -- look for your app name (e.g., `MyApp`) instead of system frameworks
3. **The first frame with your app name is usually the culprit** -- here it's frame 2, `ProfileViewModel.loadProfile()`
4. **Read further down for context** -- frame 3 shows it was called from `ProfileView.body`

### Unsymbolicated vs Symbolicated

If the log shows addresses instead of function names:

```
// Unsymbolicated (useless)
2   MyApp   0x100abc123  0x100000000 + 703779

// Symbolicated (useful)
2   MyApp   0x100abc123  ProfileViewModel.loadProfile() + 456
```

To symbolicate: open the crash log in Xcode with the matching `.dSYM` file from the archive.

---

## Other Threads

```
Thread 1:
0   libsystem_kernel.dylib   0x1890cafe0  __workq_kernreturn

Thread 2:
0   libsystem_kernel.dylib   0x1890cafe0  __workq_kernreturn

Thread 3:
0   libdispatch.dylib        0x189100000  _dispatch_worker_thread
1   MyApp                    0x100def456  DataService.syncToServer() + 234
2   MyApp                    0x100def000  DataService.backgroundSync() + 100
```

Other threads show what else was running when the crash happened. Usually they're idle (waiting on `__workq_kernreturn`). But if you see **your code in another thread**, it might be related to the crash -- especially for data race issues.

---

## Binary Images Section

```
Binary Images:
0x100000000 - 0x100ffffff MyApp arm64  <UUID> /private/var/.../MyApp.app/MyApp
0x19a000000 - 0x19a4fffff libswiftCore.dylib arm64  <UUID> /usr/lib/swift/libswiftCore.dylib
```

This maps memory addresses to binaries. Xcode uses this for symbolication. You rarely need to read this section manually.

---

## Quick Diagnosis Checklist

When you receive a crash log, answer these questions in order:

1. **What is the Exception Type?** This tells you the crash category.
2. **What does Application Specific Information say?** This is often the answer in plain English.
3. **Which thread crashed?** Thread 0 = main/UI thread. Others = background.
4. **Where is YOUR code in the call stack?** The first frame with your app name is the starting point for investigation.
5. **What was the app doing?** Look at other threads for context.
6. **Is it device- or OS-specific?** Check Hardware Model and OS Version.
7. **How long did the app run before crashing?** Compare Launch Time to Date/Time.
