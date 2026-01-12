---
description: Create a new git worktree and branch for parallel development
---

Create a new git worktree for parallel development with the following task/branch name: $ARGUMENTS

## Steps to execute:

1. **Validate input**: Ensure $ARGUMENTS is provided. If empty, ask the user for a branch/task name.

2. **Create branch name**: Convert the task name to a valid git branch name (lowercase, replace spaces with hyphens, remove special characters). Use format: `task/$ARGUMENTS` or just `$ARGUMENTS` if it already looks like a branch name.

3. **Determine worktree path**: Create the worktree inside the current working directory at `.worktrees/<branch-name>` (e.g., `.worktrees/feature-auth`). Create the `.worktrees` directory if it doesn't exist. This keeps worktrees within the project directory to avoid permission issues.

4. **Execute git commands**:
   ```bash
   # Create .worktrees directory if it doesn't exist
   mkdir -p .worktrees
   
   # Add .worktrees to .gitignore if not already present
   grep -qxF '.worktrees' .gitignore 2>/dev/null || echo '.worktrees' >> .gitignore
   
   # Create new worktree with new branch from main (or user-specified base branch)
   git worktree add -b <branch-name> .worktrees/<branch-name> main
   ```
   
   > **Note**: The branch is created from `main` by default. If the user specifies a different base branch, use that instead.

5. **Install dependencies**: Run `npm install` within the new worktree directory to ensure the environment is ready for development.

6. **Confirm success**: Report the created worktree path and branch name.

7. **Continue working in the new worktree**: From this point forward, use the new worktree path as the working directory for all subsequent commands and file operations. Simply use the `workdir` parameter for bash commands and use absolute paths based on the new worktree location.

8. **Start the task**: Begin working on the task described in $ARGUMENTS immediately.

## Important notes:
- Continue using the current OpenCode session - no need to launch a new instance
- Use the new worktree path as the working directory going forward
- If the branch already exists, offer to use `git worktree add <path> <existing-branch>` instead
