# Intake: a few questions before the film

Read this before workflow step 1. A short intake catches the choices that are expensive to change after the plates are built (length, audio, the hero, the setting, the tone). It is a light check, not an interview: a handful of questions, each answerable with one click or one letter.

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
| Hero subject | The thing tracked through every plate | the obvious smallest traveller · an alternative · a person or object at human scale |
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
- Carry the brief into the scene script (workflow step 3): plate count and durations follow the length, the hero column follows the hero, the sound column follows the audio choice, the end card follows the ending.
- For films over about a minute, the script summary you show the user before building should reflect these decisions, so they can see their answers in it.
- If an answer conflicts with a plugin rule (for example "no motion on the end card"), say so in one line and propose the nearest option that works.
- Don't ask again later about anything the intake settled; if something new comes up during the build, ask one focused question then.

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
