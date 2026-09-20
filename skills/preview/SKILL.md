---
name: preview
description: Live push to a preview environment after every turn. Use if the user has requested a preview.
---

# Preview

Finish any requested changes before pushing to a `preview` branch. When changes are ready, push them to an existing preview branch if available. If no suitable preview branch exists because it is already used by another worktree or contains changes unrelated to the current thread: create a new preview branch. Make sure the preview is at the same commit as the main branch before applying changes.

Follow the process in the skill unless it conflicts with the user request, the AGENTS.md, a skill, or any other process (in that order), those take precedence.

1. Inspect the current branch, working tree, and recent commit style. Preserve unrelated user changes.
2. Find or create the correct preview branch, never push to the main branch unless explicitly instructed.
3. Commit and push the task's changes with a concise message matching the repository's style, do this after every turn unless instructed otherwise. (Use the `yeet` skill if available for commit formatting rules.)
4. Wait for preview deployment and return the stable preview URL. 

After committing and pushing to preview and successfully deploying, put the following under your summary to the user: "Preview at <preview URL>". Replace `<preview URL>` with the actual preview URL.

**This process is designed to repeat every turn after the user has requested a preview**, so that the user can see their changes live as they are made. You only stop using this process when the user explicitly requests to stop.


## Merging to Main

**Only at the request of the user**: should you squash merge (or whatever merge strategy is asked for by user request, the AGENTS.md, a skill, or any other process) the preview branch into the main branch.

If a stable preview branch existed before the user requested a preview, you keep that branch up after the merge. If you created a new preview branch for the user, you delete that branch after the merge.

After committing and pushing to the main branch, put the following under your summary to the user: "Merged to <main branch>". Replace `<main branch>` with the actual branch name.

If the user asks for more changes after the merge, assume they want to continue using the preview process unless they state otherwise.