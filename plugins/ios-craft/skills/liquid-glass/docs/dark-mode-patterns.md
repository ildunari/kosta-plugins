# Dark Mode Patterns

Liquid Glass adapts automatically to light and dark appearances, but there are still considerations:

- **Tint opacity**: dark wallpapers often require a slightly higher tint opacity to maintain contrast. The `prominent` style automatically chooses a darker base tint in Dark Mode, but you can adjust `tintOpacity` on `GlassCard` if necessary.
- **Avoid pure black**: on OLED displays, pure black behind glass can appear too stark. Use very dark colours (`Color(white: 0.05)`) or rely on the system glass to darken the backdrop naturally.
- **Test high‑contrast mode**: ensure that tinted glass surfaces still provide adequate contrast when the user enables **Increase Contrast** or selects **Tinted** glass in Settings.
- **System bars**: navigation bars, toolbars and tab bars automatically invert their tint in Dark Mode. Do not override these defaults unless you have a compelling reason.