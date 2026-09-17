# Film and animation grammar for seams and camera

Editors and animators have names for most of what makes a transition feel natural or forced. Use these ideas when designing seams and camera moves, and use the rubric at the end to review them before anyone else has to.

Sources: Walter Murch, *In the Blink of an Eye* (the Rule of Six); Frank Thomas and Ollie Johnston, *The Illusion of Life* (the twelve principles of animation); standard editing vocabulary (match cut, cutting on action, screen direction, lead room, motivated camera).

## What matters most

Murch ranks an edit's qualities, and says to give up the lower ones before the higher ones: emotion, story, rhythm, eye trace, the flat plane of the screen, then 3D space. For these films:

- **Story first.** A transition should say something (smaller, later, elsewhere, the same thing seen differently). If it only decorates, use a plainer one.
- **Rhythm next.** Vary transition lengths and energy across the film; three slow dissolves in a row drag, three whip pans in a row exhaust.
- **Eye trace** is the one to protect at every seam. Where the viewer is looking when shot A ends is where the next thing to look at should be when shot B begins. The `--seams` overlay shows this.

## Seam vocabulary

| Idea | What it means | How to do it here |
|---|---|---|
| **Match cut** | Two shots joined by something they share | `cut` with `match`, or a custom morph |
| **Graphic match** | Shared shape, colour or composition (a red eraser and a red shell) | `shape`, a custom morph, or a colour hand-off |
| **Match on action** | A movement starts in one shot and finishes in the next | cut mid-movement; motion carry-over (`carry`) keeps the speed |
| **Cutting on action** | Cutting while something moves hides the join | put the seam during a take-off, a throw, a turn, not during a hold |
| **Screen direction** | Things keep moving the same way across cuts; flipping it confuses | keep headings consistent; `pan` with `dir: 'auto'` follows the travel |
| **Lead room / look room** | Space in front of a moving or facing subject | `follow(target, t, { lead })` places the subject behind centre |
| **Motivated camera** | The camera moves because something gives it a reason | follow a subject, push in on what matters, pull back to reveal, pan to where something looks or points |
| **Reveal** | Withhold, then show the bigger picture | macro → close-up → wide, each step paced |
| **Hand-off** | A moving subject carries the camera into the next shot, or a transition ends on the next shot's own camera | end custom transitions on the plate's opening camera (not at zoom 1) and let the plate's camera continue |
| **Whip pan** | A fast pan that blurs, joining two places | `pan` |
| **Push in / pull out** | Zoom towards or away from a subject | `cam.s`, `zoom`, `lensIn`, `lensOut` |
| **Track / follow** | The camera travels with a subject | `follow()` |
| **Crane / rise** | The camera moves up or down | `cam.dy` keyframes |
| **Hold / rest** | A still-ish moment after a big move so the eye can land | a flat stretch in a `curve`; 0.3–0.8 s with ambient motion only; no text starts before `dur + 0.4` |

### The switch-up rule: don't mirror

A push in followed by the same pull out reads as a yo-yo, however smooth it is. After moving in, leave by a different verb that the scene motivates:

- follow the subject when it moves (track with it, and pull back gradually while travelling);
- pan in the direction the subject faces or points;
- rise or fall with it;
- hand the camera to a moving object and let it lead into the next shot.

Example (`story_seams.js`, `SEAM = 'macro'`): sink into the red eraser → red fills the frame → the spots bloom → the ladybug draws itself as the camera eases back to a close-up → it takes off → the camera travels with it, pulling back to reveal the garden → the pan into the meadow continues that travel.

## Motion principles (the twelve principles, applied)

- **Anticipation:** a small move against the main one, long enough to read (0.3–0.5 s): a crouch before a jump, `E.inBack`, the ring that locks onto a hero before a lens. (The engine's `LEAD` is a slow-in, not an anticipation.)
- **Slow in and slow out:** ease every start and stop; pick the easing to match the weight (`curve`, `ease`).
- **Arcs:** things travel on curves, not straight lines; move morphs and flights along arcs.
- **Follow-through and overlapping action:** parts keep moving after the main body stops (wings settle, legs catch up, the camera settles after a move with `SETTLE`).
- **Secondary action:** small motion that supports the main one (grass swaying while the ladybug walks).
- **Timing:** the number of drawings sets weight and mood; slow for large, fast for small. A change of scale or world needs 1.4–2 s; transitions render on ones (24 drawings a second) and must stay inside the speed limits in `motion.md` (at most 5% scale or 40 px per drawing without blur; mask edges eased, not areas). Fewer drawings read as a snap, however well eased.
- **Staging:** one clear idea at a time, framed so the eye finds it first. Nothing reads while the camera is still landing: text starts at the transition's `dur + 0.4`.
- **Squash and stretch, exaggeration, appeal:** push shapes a little further than realistic so they read at a glance; keep designs simple and pleasant.
- **Straight ahead and pose to pose:** plan key poses (keyframes), then let easing fill the in-betweens.

## Seam review rubric

Score each seam 0 (fails), 1 (weak) or 2 (good). Anything scoring 0, or a total under 14 of 20, gets redesigned before render.

1. **Story:** the transition says something about the relation between the two plates.
2. **Eye trace:** the viewer's focus point is continuous (check the `--seams` overlay).
3. **Screen direction:** motion keeps its heading across the seam.
4. **Motivation:** every camera move has a reason visible on screen.
5. **No mirroring:** the exit is not the entry played backwards, and the seam's verb differs from the previous seam's on the same subject (a lens-in followed by a pull-out is a yo-yo).
6. **Cut on action or carried motion:** the seam happens during movement, or movement continues through it.
7. **Easing, arcs and speed:** no linear starts or stops; paths curve; the move stays inside the speed limits; motion_check shows no `SNAP`, pop or jerk at the seam; motion keeps its direction through the hand-off (no pull-back right after a push-in).
8. **Hold and staging:** the eye gets a beat to land after the biggest move, and no header, stat, callout or card starts before `dur + 0.4`.
9. **Hand-off:** at the end, the transition's picture matches the plate's own (no pop, no jump in size or place).
10. **Rhythm:** its length and energy differ from its neighbours where that helps the film.

Fail conditions regardless of score: (F1) a size, place or colour jump at the hand-off; (F2) HUD or text scaling with the camera; (F3) an object duplicated, missing or popping in; (F4) a seam that reads as a camera trick rather than one continuous thing; (F5) flat colour or an empty frame held long enough to read as a glitch (about 0.15 s); (F6) a snap or pop: motion_check marks the seam `SNAP` (a drawing changing more than 60, or two in a row above 45), or lists a pop or jerk there, and it is not a hard cut; (F7) text or a card starting inside the transition.
