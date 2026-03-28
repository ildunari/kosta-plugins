---
name: new-project
description: Create a new iOS project from scratch with guided setup
---

Run the full ios-project-wizard skill workflow to create a new iOS project from scratch.

Start by interviewing the user about their project:
- What kind of app are you building? (single screen, tabbed, navigation-based)
- What's the app called?
- What will it do in one sentence?
- Do you need any specific capabilities? (networking, data persistence, push notifications, camera)

Based on their answers, scaffold the complete Xcode project:
1. Create the project structure with proper organization (Models, Views, ViewModels, Services, Resources)
2. Set up the navigation architecture (NavigationStack, TabView, or both)
3. Configure the app target with the right capabilities and Info.plist entries
4. Add a design system foundation (color assets, typography scale, spacing constants)
5. Create the first screen based on what they described
6. Initialize a git repository with a clean first commit
7. Build the project to verify everything compiles
8. Launch in the simulator so they can see it running

End by showing them what was created and suggesting their first feature to build.
