---
name: write-agents-md
description: Use when the user asks to write or improve the project's AGENTS.md file.
---

# Write AGENTS.md

Write a compact file that changes how future agents make decisions. The strongest examples are short product manuals, not repository summaries or coding-style dumps.

My AGENTS.md's explain **WHY** and **HOW** we build, not **WHAT** or **WHERE**.

Key refrence files:
- [Better Osiris](https://github.com/noomstuff/better-osiris/blob/main/AGENTS.md)
- [AttaCut](https://github.com/noomstuff/attacut/blob/main/AGENTS.md)
- [Image Deduplicator](https://github.com/noomstuff/image-deduplicator/blob/main/AGENTS.md)

## Understand the project

Read existing instruction files and enough of the repository to understand the product, its main flows, terminology, risks, and verified commands. Check AGENTS.md history or prior user threads when available to analyze the context.

Separate the scopes:

- Global files hold durable personal preferences and stable environment facts.
- Project files hold product priorities, boundaries, domain language, non-obvious architecture, safety rules, and commands.
- Nested files narrow their parent. Do not repeat inherited rules.

Ask only when the target or a product decision cannot be inferred.

## Write what agents cannot safely infer

Start with one short description of the product and intended experience. Add only the sections the project needs. Useful material includes:

- Ordered priorities that resolve tradeoffs.
- Scope boundaries that prevent feature drift.
- Concrete safety or correctness invariants.
- A glossary of canonical terms when wording affects code, UI, or behavior.
- Ownership boundaries between important systems or views.
- Verified test and release rules, especially destructive-data warnings.

Write observable rules. "Prioritize safety" says little. "A removal candidate stays at its source until final confirmation" constrains implementation.

Preserve the user's precise language and some personality. Better Osiris saying the official client "annoys me" explains the product more efficiently than corporate prose would.

## Keep it lean

Leave out:

- Generic advice such as writing clean code.
- Directory trees, dependency lists, and facts easy to rediscover.
- Temporary tasks, bug lists, and speculative future rules.
- Duplicated global guidance.
- Excessively long command lists.

Do not force a standard template. AttaCut needs export guarantees. Better Osiris needs view boundaries and timetable terms. Image Deduplicator needs reversible file states. Their structures differ because their risks differ.

## Revise instead of accumulating

When updating a file, preserve deliberate choices, fix stale details, and replace vague wording. Add a rule only after a real concept or recurring failure justifies it. Prefer rewriting a section over appending exceptions.

Before finishing, challenge every line:

- Will this change an agent's choice?
- Will it remain true across many tasks?
- Is it supported by the product or user history?
- Does it belong at this scope?

Delete lines that fail. Report the meaningful changes to the user.
