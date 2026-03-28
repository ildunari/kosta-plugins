---
name: add-tests
description: Generate tests for existing code
---

Use the ios-testing-for-beginners skill to add tests to existing code.

Start by understanding the codebase:
- Look at the project structure to find models, view models, and services
- Identify which code has business logic worth testing
- Check if a test target already exists

Then generate tests systematically:

1. **Set up the test target** if it doesn't exist. Configure it with access to the main module via @testable import.

2. **Prioritize what to test** — Start with the most valuable targets:
   - Business logic and calculations (highest value)
   - State management and transitions
   - Data parsing and validation
   - Error handling paths
   - Edge cases (empty data, nil values, boundary conditions)

3. **Write the tests** using clear Given/When/Then structure:
   - Descriptive names: `test_addToCart_withExistingItems_incrementsCount`
   - One assertion per behavior (multiple assertions are fine if testing one logical thing)
   - No dependencies between tests

4. **Run all tests** via XcodeBuildMCP and verify they pass.

5. **Show the coverage** — Explain what's now tested and what the most valuable next tests would be.

Don't aim for 100% coverage. Aim for confidence that the important things work.
