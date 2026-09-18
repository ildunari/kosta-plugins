# Intake: a few questions before the film

Read this at the start of a film, before any research or scripting. A short intake catches the choices that are expensive to change after the plates are built (length, audio, the hero, the setting, the tone). It is a light check, not an interview: a handful of questions, each answerable with one click or one letter.

## 1. Ask permission first

Open with one line, for example:

> Before I start, can I ask a few quick questions so the film matches what you have in mind?

- If the user agrees, ask the questions below.
- If the user declines, or has already said something like "just make it", "no questions", "surprise me" or "use your judgement", skip the intake. State your assumptions in one line instead ("Assuming about 60 s, music and effects, a general audience, ending on the recap.") and start.
- If the request is already specific on every point that matters, skip it too and state the assumptions.
- In a non-interactive run (no way to get an answer), skip it and state the assumptions.

## 2. Choose 3–7 questions

Pick the 3–7 most important gaps given the user's request, the context they gave you (files, data, earlier messages) and what this plugin makes. Don't ask what the request already answers, and don't ask about things the plugin fixes (ink, paper, type, HUD, transition style). Fewer good questions beat many small ones; three is often enough.

Candidate areas, roughly in order of how much they change the build:

| Area | Why it matters | Typical options |
|---|---|---|
| Length | Sets the number of plates and the pacing | ≈ 30 s teaser · ≈ 60 s · 2–3 min · 4–5 min full study |
| Hero subject | The thing tracked through every plate | the obvious traveller · an alternative · a character the viewer can relate to |
| Audio | Changes the sound design and the render | music + ambience + effects · effects and ambience only · music only · silent |
| Tone and audience | Sets the copy, density of facts and pace | curious general audience · students · specialists · children |
| Setting and scenery | The places the plates show | the literal setting · a stylised map or cross-section · a mix |
| Drawing complexity | Density of each plate, build time | rich and detailed · balanced · sparse and diagrammatic |
| Paper vs night balance | How much of the film is "how it works" | mostly paper with a few night plates · even · mostly night |
| Must-include facts or data | What has to be on screen | the user's dataset or source · standard figures I research · a specific number or claim |
| Ending | The last idea the viewer keeps | recap of the whole journey · a single reframing line · a call to action · an open question |
| Delivery | The files and format | MP4 + HTML player · MP4 only · MP4 plus stills or a contact sheet |

## 3. Shape each question

- Up to four concrete options. The recommended option comes **first** and its label ends with "(Recommended)".
- Give a one-line reason for the recommendation (in the option's description, or after the options).
- Always allow an "Other" free-text answer.
- Options are specific to this request ("Follow one antibody", not "A hero"). Keep labels short.

### With the AskUserQuestion tool (Claude Code)

Use the AskUserQuestion tool when it is available. It takes at most 4 questions per call and 2–4 options per question, and it adds "Other" automatically, so don't add your own. For 5–7 questions, split them into two calls: the questions that shape the structure (length, hero, setting) first, then the rest. Each question has a short `header` (a word or two, such as "Length"), the `question` text, and `options` with a `label` and a one-line `description`; put the reason for the recommendation in the recommended option's description.

### Without the tool (Cowork, the API, other harnesses)

Write the same questions in plain text, numbered, with lettered options, the recommended one first, and an explicit "Other" as the last option. Tell the user they can answer compactly:

```
1. How long should the film be?
   a) About 60 s (Recommended) — enough for 3–4 plates without rushing
   b) About 30 s
   c) 2–3 minutes
   d) Other: tell me
2. ...

Reply compactly, e.g. "1a 2b 3: my own answer". Anything you skip, I'll decide.
```

## 4. After the answers

- Restate the decisions as a short brief (4–8 lines): length, hero, setting, audio, tone and audience, must-include facts, ending, delivery, plus any assumption you made for unanswered questions.
- **Save that brief as `brief.md`** in the film folder. It is not just a message to the user: every later phase reads it. The script is written against it, the sound plan is written against it, and each build lane is handed it so the plate it draws is consistent with decisions taken before that lane existed. A brief that only ever appeared in the conversation reaches none of them.
- Carry the brief into the scene script: plate count and durations follow the length, the hero column follows the hero, the sound column follows the audio choice, the end card follows the ending.
- For films over about a minute, the script summary you show the user before building should reflect these decisions, so they can see their answers in it.
- If an answer conflicts with a plugin rule (for example "no motion on the end card"), say so in one line and propose the nearest option that works.
- Don't ask again later about anything the intake settled; if something new comes up during the build, ask one focused question then.

## Timed plan approval

At Gate 1 the script has been written and `script-reviewer` has passed it, and the user gets a short summary of the plan before the expensive drawing starts. That is the last cheap moment to change the film — and also the moment a run most often stalls, because the user asked for a film and walked away. A film that waits four hours for a reply is worse than a film built from a reviewed plan, so the gate is timed.

### Post the summary with its deadline in the same message

Say when you will start, in the message that asks. Never post a summary that just waits, and never start a silent timer the user cannot see.

> I'll start building in 10 minutes unless you'd rather change something.

**10 minutes is the default.** Give longer when the build is long or expensive — a four-minute film, a topic that needs unusual research, anything that will take an hour of rendering — and say why in the same line ("this one's about 20 minutes of drawing, so I'll wait 20"). If the user has set their own wait ("always give me an hour", "don't wait, just go"), that wins over both.

### Silence counts as approval

When the deadline passes with no reply, build the reviewed plan. Say so in one line as you start, so the user can see what happened when they come back:

> No reply by the deadline, so I'm building the plan above. The script and seams stay editable until the final render.

Don't re-ask, don't extend the wait on your own, and don't post a second summary. One card, one deadline, then work.

### What the summary contains

One or two lines per scene, and nothing else. The user is probably reading this on a phone, so keep it short enough to take in at a glance: no tables, no plate script columns, no code. The full script lives in `script.md` if they want it.

- **The hero and its journey** in one line: what the viewer follows, and where it ends up.
- **One or two lines per scene**: what is on screen and what it shows. Numbered, in order.
- **The length**, in seconds, and the number of scenes.
- **The sound idea** in one line (music and effects, ambience only, silent).
- **Anything the intake left open**, stated as the assumption you made. This is the part most likely to draw a reply, so put it last, where it is easy to answer.

If the intake answered everything and nothing was assumed, say that too — it tells the user there is nothing to check.

### What stays editable, and what a late reply costs

A late answer should not be wasted, so say what is still changeable. The script and the seam list stay editable until the final render, and so do the scene content, the pacing and the sound. Tell the user which changes are cheap and which are not, so they can judge whether their reply is worth sending:

| Change | Cost |
|---|---|
| Copy: a title, a caption, a stat's wording, the end card's quote | Cheap — an edit and one rebuild, at any point |
| Timings and pacing: a beat that lingers, a seam that is too quick | Cheap — a rebuild and a fresh check of that seam |
| Sound: cues, a bed, a moment of silence | Cheap — the cue sheet is separate from the drawing |
| The facts or numbers on a plate | Moderate — the plate is redrawn around them, and the source has to be found |
| Swapping or reordering a scene | Expensive — two seams are rewritten, and both neighbouring plates change with them |
| A new scene, a different hero, a different length | Expensive — the script, the seam list and the sound plan are all redone, and most of the drawing is thrown away |

So a reply that arrives during the build is usually still worth acting on; a reply that arrives after the final render is worth acting on only for the cheap rows. When a late reply lands, apply it, say in one line what it changed and what had to be rebuilt, and carry on.

### What may start during the wait

The wait is not idle time. Everything the plan does not govern can begin as soon as the summary is posted:

- Setting up the working folder and copying the toolkit into it.
- Writing `helpers.js`: this film's palette additions, the shared drawings, the bed generators.
- The sound plan — `sound-designer` works from the reviewed script, and cues are cheap to change afterwards.
- Reading the references the build needs, and gathering any facts still outstanding with their sources.

**The art lanes do not start.** Drawing the plates is the expensive work the plan exists to govern, and a scene change after the lanes have run throws that work away. Hold them until the deadline passes or the user replies.

### If the user skipped intake

A user who said "just make it", "surprise me" or "no questions" has already told you not to hold the run up. Gate 1 still posts the summary — they should be able to see what is being built, and a late correction is still worth having — but it need not wait at all. Post the card, say you are starting now, and start:

> Here's the plan. Building it now; tell me any time if you'd rather change something.

The same rule covers a non-interactive run, where there is no way to get an answer: post the summary into the transcript for the record and carry on.

## Worked example

**Request:** "Make a doodle film explaining how a vaccine teaches the immune system."

The request settles the topic but not length, hero, audio, audience or ending. The look is fixed by the plugin, and the facts are standard, so no question about data. Five questions, so two AskUserQuestion calls (or one plain-text list).

Permission line: "Before I start, can I ask a few quick questions so the film matches what you have in mind?" The user says yes.

**Call 1 (structure):**

| Header | Question | Options (first is recommended) |
|---|---|---|
| Length | How long should the film be? | **About 90 s (Recommended)**: room for injection, antigen, B and T cells and memory without rushing · About 45 s · 3–4 minutes · About 30 s |
| Hero | What should we follow through the film? | **One spike-protein fragment (Recommended)**: small, present in every stage, easy to tag (`AG·01`) · One B cell that becomes a memory cell · The vaccine dose itself |
| Audience | Who is it for? | **Curious adults (Recommended)**: plain words, one number per plate · Secondary-school students · Clinicians and scientists |

**Call 2 (finish):**

| Header | Question | Options (first is recommended) |
|---|---|---|
| Audio | What should it sound like? | **Music, ambience and effects (Recommended)**: the plugin's full sound design carries a film with no narration · Effects and ambience only · Silent |
| Ending | What should the last plate leave people with? | **A later infection met fast by memory cells (Recommended)**: shows the payoff, not just the mechanism · A recap of the whole journey · A single reframing line |

"Other" is added by the tool to each question. In plain text, the same questions become `1. … a) About 90 s (Recommended) … d) Other`, and the user might reply "1a 2b 3a 4: effects only, no music 5a".

**Brief after the answers:** ≈ 90 s, 5 plates plus title and end card · hero: one B cell (`B·01`) · curious adults · effects and ambience, no music bed · ending: a later infection cleared fast by memory cells · MP4 + HTML player (assumed) · sources: standard immunology references, cited on the end card.
