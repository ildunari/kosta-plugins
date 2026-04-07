# Rendering Optimization

- Minimize offscreen rendering: avoid masking+shadow combos and supply `shadowPath`. citeturn21search11
- Prefer opaque views and reduce alpha blending.
- Use Hitches with Time Profiler to connect jank to causes. citeturn18search16
