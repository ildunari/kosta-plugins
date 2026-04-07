# Instruments Guide

This guide shows how to choose the right instrument, record, export, and analyze traces.

## Choose a Template
- **Time Profiler**: find CPU hot paths. citeturn7search7
- **Allocations + Leaks**: track heap growth and leaks. citeturn7search1turn7search3
- **Power Profiler**: measure power impact. citeturn7search6
- **Hitches**: detect animation/scroll hitches. citeturn18search16

## Record and Export
Use `xcrun xctrace` to automate:
```bash
xcrun xctrace record --template 'Time Profiler' --launch -- /Applications/MyApp.app
xcrun xctrace export --input run.trace --toc
xcrun xctrace export --input run.trace --output exported --xpath '/trace-toc/run[@number="1"]/data/table[@schema]'
```
citeturn19view0

## Analyze
Load the exported JSON into `scripts/instruments_analyzer.py` to rank hotspots and signposts.
