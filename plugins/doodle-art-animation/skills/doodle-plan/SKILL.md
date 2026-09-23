---
name: doodle-plan
description: Plan a doodle-art-animation film before anything is drawn - the intake round, parallel research lanes, the hero and the scene script, the blocking script review, and a plan card for the user. Ends with an approved script.md, facts.md and brief.md in a working folder.
disable-model-invocation: true
argument-hint: "[topic or source] [working folder]"
---

# Doodle Plan

Plan a film: phases 0 to Gate 1 of the workflow in the `doodle-art-animation` skill. This command ends with an approved plan on disk and **nothing drawn**. Building is `/doodle-art-animation:doodle-build`.

Do the phases in this order. A review of a script that isn't written yet is a review of nothing, and a plate drawn against an unapproved script gets thrown away.

## 1. Set up and read

- Arguments given: `$ARGUMENTS` (both optional: first the topic, question or source file, then the working folder). If the topic is missing, ask for it in one line.
- The working folder is the second argument, otherwise a new folder named after the film beside the user's source (or the current directory if they gave one). `mkdir -p <folder>`, `cd` into it, confirm with `pwd`. `brief.md`, `facts.md` and `script.md` are written here; the toolkit is copied in at step 6, once the plan card is up.
- The skill lives at `${CLAUDE_PLUGIN_ROOT}/skills/doodle-art-animation`. If that path was not filled in, use `${CLAUDE_SKILL_DIR}/../doodle-art-animation`.
- Read before writing anything: `references/intake.md`, `references/writing.md`, `references/style.md`, `references/motion.md`, `references/animation-principles.md`, `references/film-grammar.md`. Skim the seam list at the top of `toolkit/story_example.js` to see what a finished script turns into.

## 2. Intake, then `brief.md`

Run the question round exactly as `references/intake.md` describes: ask permission first, 3–7 questions, up to four options with the recommended one first, always an `Other`, the question tool when the harness has one and plain numbered text otherwise.

Skip the round when the user said "just make it", "no questions", "use your judgement", when the request already settles everything that matters, or when the run is non-interactive. Then state the assumptions in one line instead.

Either way, write the decisions to `brief.md`: length, hero, setting, audio, tone and audience, must-include facts, ending, delivery, and every assumption you made. Every later phase reads this file.

## 3. Research lanes, then `facts.md`

Research runs in two steps, because checking a number needs the number first.

**First, in parallel** — start both with the Agent tool **in one message**, each returning facts with a source for every number:

- **Topic research** — the mechanism, the stages, the standard figures, what a general reader gets wrong.
- **The user's own data or sources** — read the files, dataset or links they gave, and pull the 10–20 numbers that matter (`references/writing.md`, "Adapting any subject").

**Then, on what they returned** — merge the two into a draft `facts.md` and hand it to one more agent:

- **Numbers and citations** — check every figure in the draft against a second source, do the arithmetic on every comparison, and mark what is exact, `≈`, a range or illustrative. Started alongside the others it would have nothing to check.

Don't fan out when it costs more than it saves: a small or familiar topic, a single source document, or a user who already supplied the facts. Do it yourself in one pass and say so.

Apply its corrections and write the final `facts.md`, one line per fact: the number with its unit, the claim in plain words, the source, and exact / `≈` / illustrative. Drop anything you can't source — every number on screen needs one, and the sources go on the end card.

## 4. The hero, then `script.md`

Pick the one subject the viewer follows through every plate and give it an ID tag (`NP·01`, `FOX·01`, `PKT·01`). Then write the scene script in the table format of `references/writing.md` ("Plate script format"), and under it the seam list ("Designing the seams") with exit, entry, link and transition for every seam.

While you write it, plan how the motion flows (`references/animation-principles.md`): inside a scene the animations overlap, stagger and hand off instead of stopping and starting, and each seam carries motion from one scene into the next. Check as you go that the durations add up to the length in `brief.md`, that every line of text has time to be read, that the film uses 4–6 transition types once it has five or more seams, and never the same one three times in a row, and `fade` only into the end card.

Save it as `script.md` in the working folder. The reviewers look for it there.

## 5. Gate 1 — script review (blocking)

Only once `script.md` is saved, run `doodle-art-animation:script-reviewer` with the Agent tool. Give it the absolute path to `script.md`, `brief.md` and `facts.md`, the user's request word for word, and the intake answers (say so if there were none). Give it the source's path only for spot-checks, with the page or line range behind each fact in `facts.md`; don't point it at the whole paper or its figure images. It reviews the plan, not the science, and on biomedical papers a reviewer reading the full text and figures has been stopped part-way by an automated safety check. If a reviewer stops that way anyway, say so plainly, with the message it gave.

Nothing else runs yet. Don't start `sound-designer` here and don't open a build lane; both need the script the review is about to change.

Apply every must-fix that does not break something the user asked for. When one does — a beat that pushes a 30-second film past its length, a change of hero — take the reviewer's recommendation if it keeps the user's constraint, otherwise the cheapest version that does, and record the trade in one line on the plan card rather than silently choosing either side. For the rest, either apply it or say in one line why you kept your version. Re-save `script.md`. If the verdict was `revise` and the edits were large, run the reviewer once more on the saved file.

## 6. The plan card

Post the plan card as `references/intake.md` describes under "The plan card": one or two lines per scene, the hero's journey, the length, the sound idea, and the assumptions the intake left open. End it with the line that says what happens next — reply to change anything, otherwise run the build — and say what stays editable afterwards (the script and the seams, up to the final render).

There is no clock to run: you cannot time ten minutes, and a reply typed now would not reach you until this turn ends. So the card is followed by the work the plan does not govern, and then by the handoff. That work is the wait:

- the working folder already exists from step 1; copy the toolkit into it now, from the skill path resolved in step 1 (`cp -R "<skill>/toolkit/." .`, where `<skill>` is `${CLAUDE_PLUGIN_ROOT}/skills/doodle-art-animation`, or `${CLAUDE_SKILL_DIR}/../doodle-art-animation` when that is empty);
- `helpers.js`: the film's palette names, the hero function and its ID tag, shared shapes, and **any constant a seam anchors to** (a landing point, a hand-off position) — the seam list names those, and a plate whose `enter` reads one from another plate's file cannot build on its own;
- the sound plan: `doodle-art-animation:sound-designer` on the reviewed `script.md`, saved as `cues.md`. Hand it the script, the brief and the request, not the sources: it designs to beats and mood.

This may **not** start: any art lane, any `plate_*.js`, any build of the film. If the user comes back with changes, a drawn plate is wasted work.

Users who said to just make it, unattended runs, and runs with no way to reach the user get the card for the record and go straight on to the build.

## 7. Hand off

Print, as a short list, exactly what the next command needs:

- the absolute working folder;
- `script.md` (approved, with the seam list);
- `facts.md` and `brief.md`;
- `helpers.js`, and `cues.md` if the sound plan ran.

Then tell the user to run `/doodle-art-animation:doodle-build <folder>`, and say in one line what it will do (a lane per scene, one assembly, one build, one shared QA render). Don't draw anything in this command.
