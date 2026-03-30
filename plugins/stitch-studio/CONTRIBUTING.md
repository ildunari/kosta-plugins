# Contributing to Stitch Studio

## Adding a New Skill

1. Create `skills/stitch-<name>/SKILL.md` with proper frontmatter
2. Ensure `name` field matches the directory name
3. Add a trigger-rich description with example phrases
4. Add the skill path to `.claude-plugin/marketplace.json`
5. Update `docs/skills-index.md` and `README.md`

## Skill Writing Guidelines

- Keep SKILL.md body under 200 lines
- Use imperative voice ("Parse the file", not "You should parse the file")
- Put detailed reference material in `references/`
- Include anti-patterns section
- Test with `claude plugin validate .`

## Pull Requests

- One skill or component per PR
- Include a test prompt that demonstrates the skill working
- Update documentation

## License

By contributing, you agree that your contributions will be licensed under Apache 2.0.
