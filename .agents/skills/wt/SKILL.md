---
name: wt
description: Create a new git worktree and branch for parallel development. Use this when Codex needs to run `/wt`, create an isolated worktree for a task, branch work in parallel, or start work in a separate branch without disturbing the current checkout.
---

# WT

Create a new git worktree for parallel development using `$ARGUMENTS` as the task name or branch name.

## Workflow

1. Validate input.
If `$ARGUMENTS` is empty, ask for a task name or branch name.

2. Derive the branch name.
Normalize the task name into a valid git branch name: lowercase, spaces to hyphens, strip special characters.
Use `task/<branch-name>` unless the provided value already looks like a branch name.

3. Choose the worktree path.
Create the worktree at `.worktrees/<branch-name>` inside the current repository.
Create `.worktrees` first if it does not exist.

4. Prepare ignore rules.
Ensure `.worktrees` is listed in `.gitignore`:

```bash
mkdir -p .worktrees
grep -qxF '.worktrees' .gitignore 2>/dev/null || echo '.worktrees' >> .gitignore
```

5. Create the worktree.
Create a new branch from `main` by default:

```bash
git worktree add -b <branch-name> .worktrees/<branch-name> main
```

If the user names a different base branch, use that branch instead of `main`.
If the branch already exists, offer:

```bash
git worktree add .worktrees/<branch-name> <existing-branch>
```

6. Install dependencies in the new worktree.
Run `npm install` inside `.worktrees/<branch-name>` so the environment is ready.

7. Switch subsequent work into the new worktree.
From that point onward, run commands and edit files in the new worktree path, not in the original checkout.

8. Start the requested task immediately.
Do not stop after creating the worktree if the user asked for actual implementation work.

## Notes

- Keep the worktree inside the repository at `.worktrees/` to avoid permission and discoverability problems.
- Continue in the current Codex session; do not launch a separate instance just because a worktree was created.
- If already operating inside a worktree, keep reads and writes scoped to that worktree.
