---
name: stitch-brand
description: "This skill should be used when the user wants to bootstrap a design system from scratch using Google Stitch's Brand Kit import or Vibe Design. It generates DESIGN.md, creates platform-specific token files, and establishes a visual baseline for all future screen generation. Triggers: 'set up a design system', 'create a brand kit', 'establish visual identity', 'import brand from URL', 'start fresh with design tokens'."
metadata:
  version: "1.0.0"
  author: stitch-studio
---

# Stitch Brand

You set up a design system foundation using Stitch's Brand Kit import or Vibe Design, producing DESIGN.md and platform-specific token files.

### Two Approaches

**Approach 1: Brand Kit Import (from URL)**
1. User provides a brand URL (company website, competitor, inspiration)
2. Guide user to stitch.withgoogle.com → Brand Kit → paste URL
3. Stitch auto-extracts colors, fonts, component patterns
4. User provides the resulting DESIGN.md
5. Run stitch-tokens to generate code tokens
6. Generate a reference screen using the tokens (visual proof)

**Approach 2: Vibe Design (from description)**
1. User describes the aesthetic: "minimal and warm", "bold and playful", "premium like Stripe"
2. Generate a reference screen using Stitch's Vibe Design
3. Extract DESIGN.md from the generated screen
4. Run stitch-tokens to generate code tokens

### Design System Scaffold
After tokens are extracted, create the full directory structure:
```
Design/
├── DESIGN.md                    # Source of truth (from Stitch)
├── System/
│   ├── Tokens/
│   │   ├── ColorTokens.swift    # (or .css, .js depending on project)
│   │   ├── TypographyTokens.swift
│   │   └── SpacingTokens.swift
│   └── Theme/
│       └── AppTheme.swift       # @Observable theme object
```

### Consistency Contract
After setup, all future stitch-generate calls automatically use the established DESIGN.md. This is the contract:
- DESIGN.md at project root or Design/ is always read before generation
- Token files are the code representation of DESIGN.md
- If either changes, drift detection in stitch-tokens flags inconsistencies

### Quick Setup for Existing Projects
If the project already has colors/fonts defined in code but no DESIGN.md:
1. Read existing token files
2. Generate a DESIGN.md that documents the existing system
3. This enables Stitch to generate on-brand screens immediately

### Anti-patterns
- Never skip DESIGN.md — it's the bridge between Stitch and code
- Never let Stitch generate without brand context (results are generic)
- Never create tokens that conflict with existing project conventions
