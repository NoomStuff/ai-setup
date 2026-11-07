---
name: pr
description: Use when the user asks to open, update, merge, or watch a pull request.
---

# PR

Finish any requested changes before opening a pull request. Follow the process in the skill unless it conflicts with the user request, the AGENTS.md, a skill, or any other process (in that order), those take precedence.

1. Inspect the current branch, working tree, recent commit style, and whether the branch already has an open PR. 
2. If you are on the default branch, create a new branch first. Match the naming style of existing branches, otherwise use a short kebab-case name for the change.
3. Commit and push the changes. Use the `yeet` skill if available for commit formatting rules. Then open the PR when ready.
4. Only merge when the user has given permission. Use the merge strategy they, the AGENTS.md, or the repository specify, otherwise squash merge. Delete the branch after merging if you created it.

## Title and body

Match the title to the commit style of the repository. Keep the body short:

- What changed and why, as the gist, not a file-by-file list.
- How you verified it. Name the tests or commands you actually ran. If something is unverified, say so.
- Anything the reviewer should look at closely or decide on.

Follow the writing advice in the system prompt. Put roles, placeholders, and code like `@types/node` in backticks.

## Summary

After opening or updating the PR, put the following under your summary to the user: "Opened <PR URL> from `<branch>` into `<base>`" or "Pushed `<branch>` to <PR URL>". After merging, use "Merged <PR URL> into `<base>`".
