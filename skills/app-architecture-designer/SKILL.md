---
name: app-architecture-designer
description: Design new app architecture, review existing apps, or refactor substantial structural and code-quality problems. Use for important architecture decisions and full app reviews.
---

# App architecture

Make codebase easier to understand, change, and trust. Replace large parts when that solves a real problem. Good architecture should reduce the effort of working on the app, not just make the file tree busier.

## Ownership

This skill owns internal state, module boundaries, data contracts, persistence, reliability, performance, and structural code quality.

Use `ux-product-designer` for user goals, terminology, interaction rules, and user-visible states. Use `ui-visual-designer` for appearance, styling, motion, and visual QA. A full app review can use all three; internal cleanup should preserve the agreed product behavior.

## Understand before changing

Inspect the actual implementation and primary flow. Establish what already works and what should stay the same, including the small interactions that make the app feel good. Surprising behavior may be intentional. Investigate before calling it a bug.

Be direct about weak design and propose substantial changes when justified. Respect whether the user asked for findings, planning, or implementation, including any areas they excluded along the way.

For reviews, prioritize problems by their effect on correctness, usability, performance, and future work. Explain the concrete problem, the responsible code, and what the change improves. Separate verified failures from concerns and preferences.

## New apps

Start from the intended workflow and a concrete understanding of the app's objects, actions, and saved state. Resolve ambiguity that changes what gets built without turning routine implementation choices into questions.

Inspect reference projects when the user supplies them. Be deliberate about what to reuse, adapt, or build fresh. Respect the chosen stack and product scope. When implementation is requested, carry the work through to a usable app rather than stopping at a shell or mockup.

## Structure and code quality

- Use strict types across the implementation and its boundaries when available. Check that the tooling actually enforces them.
- Give state and behavior clear owners. Keep state local until sharing it has a purpose, and avoid duplicate representations that can drift apart.
- Split by responsibility, reuse, or meaningful boundaries. Avoid both unrelated logic in one massive file and tiny files that scatter a simple operation.
- Reuse components and functions where repetition is meaningful. Abstractions should make the next change easier to follow.
- Remove dead code, redundant wrappers, obsolete settings, and replaced execution paths. Backwards compatibility is not a default requirement unless requested.
- Cut defensive code that cannot explainably earn its place. Keep concise protection against real failures at external boundaries and during consequential operations.

Fewer lines are useful only when the result stays clear and preserves the required behavior. Do not quietly remove guarantees or user data to simplify an implementation. Explain changes that are not an obvious improvement.

## Tests

Use the project's relevant formatting, lint, strict type checks, build, and tests.

- Tests should protect meaningful behavior or real failure modes.
- Avoid duplicate coverage and assertions that only restate the implementation.
- Tests have to remain useful and relevant even after the current work is done. Remove or rewrite tests that are no longer meaningful. Clean up temporary tests and do not add uselessly minute coverage.
- Pick testing methods that are most useful for the app, implement features that allow agents like you to easily and confidently verify changes & app state when applicable. Sometimes unit tests are fine, but other times the app actually needs to be run and interacted with.
- We do not need 100% coverage, just be confident that the most critical parts don't regress.

## Preserve behavior and verify

Compare the actual app before and after structural changes. **Regressions are a NO GO**.

Investigate performance with workloads relevant to the app. Check whether the change improves responsiveness and resource use while retaining the expected results.

Report what changed, why it helps, and what was verified. Call out intentional behavior changes, non-obvious tradeoffs, remaining concerns, and anything important that could not be checked.
