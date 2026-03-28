---
name: explain-ios
description: Plain-English explanation of any iOS concept
---

Explain the iOS concept provided in $ARGUMENTS using plain English that anyone can understand.

Follow this structure:

1. **What it is** — One sentence, no jargon. Use a real-world analogy. For example: "@State is like a whiteboard in a room — when someone changes what's written on it, everyone in the room sees the update automatically."

2. **Why it exists** — What problem does this solve? What was life like before it? "Before SwiftUI had @State, you had to manually tell every piece of UI to update whenever data changed. It was like having to call every person in the room to tell them the whiteboard changed."

3. **How to use it** — Show the minimal working code example. Not a toy — the smallest real thing. Add inline comments on every important line.

4. **Common mistakes** — What do beginners get wrong with this concept? Show the wrong way and the right way side by side.

5. **When to use it vs alternatives** — If there are related concepts (like @State vs @Binding vs @Observable), explain when each one is the right choice. Use a simple decision tree.

6. **Go deeper** — Point to the relevant ios-craft skill for hands-on practice: "Want to build a screen using this? Try the swiftui-guided-builder skill."

If the concept is broad (like "SwiftUI" or "networking"), break it into digestible pieces and offer to go deeper on any one of them.

If $ARGUMENTS is empty, ask what concept the user wants explained.
