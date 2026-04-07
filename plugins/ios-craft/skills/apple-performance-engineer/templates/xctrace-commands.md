# xctrace Command Recipes

- List templates/instruments/devices:
```
xcrun xctrace list templates
xcrun xctrace list instruments
xcrun xctrace list devices
```
- Record and export:
```
xcrun xctrace record --template 'Time Profiler' --time-limit 30s --launch -- /Applications/MyApp.app
xcrun xctrace export --input run.trace --toc
xcrun xctrace export --input run.trace --output exported --xpath '/trace-toc/run[@number="1"]/data/table[@schema]'
```
citeturn19view0
