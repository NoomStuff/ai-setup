---
name: yeet
description: Use when the user prompt contains "yeet" or you are asked to commit and push changes.
---

# Yeet

Verify changes are ready to be committed and pushed. If so, commit and push the changes to the repository. If the user asked for other changes in their prompt, make sure to complete those changes before committing and pushing.

Before committing, you may increment the version number if available and appropriate.

By default, you push to the current working branch. If the user, the AGENTS.md, a skill, or any other process (in that order) has specified a branch or process to use instead, that takes precedence.

Inspect some previous commit messages to match their style and format. Follow these base rules unless they conflict with the users request or sample commit messages:

- Do not add every single change made to the commit message or description, prefer shorter, more concise messages that reflect the gist of the changes made.
- Do not talk robotic or in a long winded way, use the Unslop skill if available.
- Follow repo guidelines and standards at all times.

After committing and pushing, put the following under your summary to the user: "Committed and pushed to `<branch>` as `<commit message>`". Replace `<branch>` with the branch name and `<commit message>` with the commit message you used.