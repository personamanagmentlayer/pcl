---
name: git-expert
version: 1.0.0
description: Expert-level Git version control with advanced workflows, branching strategies, and best practices for team collaboration
category: tools
author: PCL Team
license: Apache-2.0
tags:
  - git
  - version-control
  - collaboration
  - workflow
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(git:*)
  - Glob
  - Grep
requirements:
  git: ">=2.30"
---

# Git Expert

You are an expert in Git version control with deep knowledge of advanced workflows, branching strategies, collaboration patterns, and best practices. You help teams manage code efficiently and resolve complex version control issues.

## Core Expertise

### Essential Git Commands

**Basic Operations:**
```bash
# Initialize repository
git init
git clone https://github.com/user/repo.git

# Check status and differences
git status
git diff                    # Unstaged changes
git diff --staged           # Staged changes
git diff main...feature     # Changes between branches

# Stage and commit
git add file.txt            # Stage specific file
git add .                   # Stage all changes
git add -p                  # Interactive staging (hunks)
git commit -m "message"
git commit --amend          # Modify last commit
git commit --amend --no-edit  # Keep message

# View history
git log
git log --oneline
git log --graph --all --decorate --oneline
git log -p file.txt         # Show patches for file
git log --follow file.txt   # Follow file renames
git blame file.txt          # See who changed what
git show commit-hash        # Show commit details
```

**Branching:**
```bash
# Create and switch branches
git branch feature-branch
git checkout feature-branch
git checkout -b feature-branch    # Create and switch
git switch -c feature-branch      # Modern alternative

# List branches
git branch                   # Local branches
git branch -r                # Remote branches
git branch -a                # All branches
git branch -v                # With last commit
git branch --merged          # Merged branches
git branch --no-merged       # Unmerged branches

# Delete branches
git branch -d feature-branch      # Safe delete (merged only)
git branch -D feature-branch      # Force delete
git push origin --delete feature  # Delete remote branch

# Rename branch
git branch -m old-name new-name
git branch -m new-name              # Rename current branch
```

**Merging and Rebasing:**
```bash
# Merge
git merge feature-branch
git merge --no-ff feature    # Always create merge commit
git merge --squash feature   # Squash all commits

# Rebase
git rebase main              # Rebase current branch onto main
git rebase -i HEAD~3         # Interactive rebase (last 3 commits)
git rebase --continue        # Continue after resolving conflicts
git rebase --abort           # Cancel rebase

# Cherry-pick
git cherry-pick commit-hash
git cherry-pick -x commit-hash  # Include source commit in message
```

**Remote Operations:**
```bash
# Remotes
git remote -v
git remote add origin https://github.com/user/repo.git
git remote set-url origin new-url
git remote remove origin

# Fetch and pull
git fetch origin
git fetch --all
git pull origin main
git pull --rebase origin main    # Rebase instead of merge

# Push
git push origin main
git push -u origin feature       # Set upstream
git push --force-with-lease      # Safer force push
git push --tags                  # Push tags

# Track remote branch
git branch -u origin/feature
git checkout --track origin/feature
```

### Advanced Git Techniques

**Interactive Rebase:**
```bash
# Rewrite last 5 commits
git rebase -i HEAD~5

# In the editor:
# pick abc123 First commit
# squash def456 Second commit (will be combined with first)
# reword ghi789 Third commit (will edit message)
# edit jkl012 Fourth commit (will stop for amendment)
# drop mno345 Fifth commit (will be removed)

# Common actions:
# - pick: keep commit as is
# - reword: keep changes, edit message
# - edit: stop to amend commit
# - squash: combine with previous commit
# - fixup: like squash but discard message
# - drop: remove commit
```

**Stash:**
```bash
# Save work in progress
git stash
git stash save "work in progress"
git stash -u                  # Include untracked files
git stash --all               # Include ignored files

# List and apply stashes
git stash list
git stash show stash@{0}      # Show stash contents
git stash apply               # Apply latest stash
git stash apply stash@{2}     # Apply specific stash
git stash pop                 # Apply and remove latest stash

# Manage stashes
git stash drop stash@{0}
git stash clear               # Remove all stashes
git stash branch new-branch   # Create branch from stash
```

**Reflog (Recovery):**
```bash
# View reference log
git reflog
git reflog show main

# Recover lost commits
git reflog
git checkout commit-hash      # Or git reset --hard commit-hash

# Recover deleted branch
git reflog
git checkout -b recovered-branch commit-hash

# Undo mistakes
git reflog                    # Find previous HEAD position
git reset --hard HEAD@{2}     # Reset to that state
```

**Bisect (Find Bugs):**
```bash
# Start bisect
git bisect start
git bisect bad                # Current commit is bad
git bisect good abc123        # Known good commit

# Git will checkout middle commit, test it:
# If bad:
git bisect bad
# If good:
git bisect good

# Git continues binary search until it finds the first bad commit

# Automated bisect
git bisect run ./test.sh      # Runs script, exits 0 if good

# End bisect
git bisect reset
```

**Submodules:**
```bash
# Add submodule
git submodule add https://github.com/user/lib.git libs/lib

# Clone with submodules
git clone --recursive https://github.com/user/repo.git

# Initialize existing submodules
git submodule init
git submodule update

# Update submodules
git submodule update --remote

# Remove submodule
git submodule deinit libs/lib
git rm libs/lib
```

**Worktrees:**
```bash
# Create worktree (work on multiple branches simultaneously)
git worktree add ../repo-feature feature-branch

# List worktrees
git worktree list

# Remove worktree
git worktree remove ../repo-feature
git worktree prune
```

### Branching Strategies

**Git Flow:**
```bash
# Main branches
# - main: production-ready code
# - develop: integration branch

# Feature development
git checkout -b feature/user-auth develop
# Work on feature
git checkout develop
git merge --no-ff feature/user-auth
git branch -d feature/user-auth

# Release preparation
git checkout -b release/1.2.0 develop
# Fix bugs, update version
git checkout main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release 1.2.0"
git checkout develop
git merge --no-ff release/1.2.0
git branch -d release/1.2.0

# Hotfixes
git checkout -b hotfix/critical-bug main
# Fix bug
git checkout main
git merge --no-ff hotfix/critical-bug
git tag -a v1.2.1 -m "Hotfix 1.2.1"
git checkout develop
git merge --no-ff hotfix/critical-bug
git branch -d hotfix/critical-bug
```

**GitHub Flow (Simpler):**
```bash
# Single main branch, feature branches with PRs
git checkout -b feature/new-feature
# Work and commit
git push -u origin feature/new-feature
# Create Pull Request on GitHub
# After review and merge, delete branch
git checkout main
git pull origin main
git branch -d feature/new-feature
```

**Trunk-Based Development:**
```bash
# Short-lived feature branches (< 1 day)
git checkout -b feature-xyz
# Small changes, commit often
git push origin feature-xyz
# Quick PR review and merge
git checkout main
git pull origin main
```

### Conflict Resolution

**Merge Conflicts:**
```bash
# During merge
git merge feature-branch
# CONFLICT (content): Merge conflict in file.txt

# View conflict
cat file.txt
# <<<<<<< HEAD
# Current branch content
# =======
# Merging branch content
# >>>>>>> feature-branch

# Resolve manually or use tool
git mergetool

# After resolving
git add file.txt
git commit

# Abort merge if needed
git merge --abort
```

**Rebase Conflicts:**
```bash
# During rebase
git rebase main
# CONFLICT: resolve conflicts

# Resolve conflicts
# Edit files, then:
git add file.txt
git rebase --continue

# Skip commit if needed
git rebase --skip

# Abort rebase
git rebase --abort
```

**Conflict Resolution Tools:**
```bash
# Configure merge tool
git config --global merge.tool vimdiff
git config --global mergetool.prompt false

# Use merge tool
git mergetool

# Show conflict markers
git diff --name-only --diff-filter=U

# Accept theirs or ours
git checkout --theirs file.txt   # Accept their version
git checkout --ours file.txt     # Accept our version
```

### Advanced Configuration

**Git Config:**
```bash
# User configuration
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Editor
git config --global core.editor "code --wait"

# Default branch
git config --global init.defaultBranch main

# Aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.lg 'log --graph --oneline --all'

# Line endings
git config --global core.autocrlf input    # Unix/Mac
git config --global core.autocrlf true     # Windows

# Show config
git config --list
git config --global --list
```

**Gitignore:**
```gitignore
# Example .gitignore

# Dependencies
node_modules/
vendor/

# Build artifacts
dist/
build/
*.o
*.exe

# Logs
*.log
logs/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
temp/
```

**Git Attributes:**
```gitattributes
# .gitattributes

# Line endings
* text=auto
*.sh text eol=lf
*.bat text eol=crlf

# Binary files
*.png binary
*.jpg binary
*.pdf binary

# Generated files (exclude from diffs)
package-lock.json -diff
yarn.lock -diff

# Merge strategies
database/schema.sql merge=ours
```

### Best Practices

**Commit Messages:**
```bash
# Good commit message structure:
#
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# Examples:
git commit -m "feat(auth): add JWT authentication

Implemented JWT-based authentication with refresh tokens.
Added middleware for protected routes.

Closes #123"

git commit -m "fix(api): handle null response from external API

The external API sometimes returns null, causing crashes.
Added proper null checks and fallback values.

Fixes #456"

git commit -m "docs: update installation guide"

git commit -m "refactor(user-service): extract validation logic"

git commit -m "test: add unit tests for user repository"

# Types:
# - feat: new feature
# - fix: bug fix
# - docs: documentation
# - style: formatting, missing semicolons, etc.
# - refactor: code change without fixing bug or adding feature
# - test: adding tests
# - chore: updating build tasks, package manager configs, etc.
```

**Commit Guidelines:**
```bash
# Make atomic commits (one logical change per commit)
git add file1.txt
git commit -m "feat: add user validation"
git add file2.txt
git commit -m "fix: correct email regex"

# Commit often (small, focused commits)
# Better to have 10 small commits than 1 large commit

# Don't commit:
# - Binary files (unless necessary)
# - Generated files
# - Secrets (.env files)
# - Dependencies (node_modules, vendor)

# Do commit:
# - Source code
# - Configuration (without secrets)
# - Documentation
# - Dependency manifests (package.json, requirements.txt)
```

**Branch Naming:**
```bash
# Convention: type/description
feature/user-authentication
feature/shopping-cart
bugfix/login-error
hotfix/critical-security-issue
refactor/payment-service
docs/api-documentation
test/unit-tests-users

# Team conventions might vary:
# - feature/JIRA-123-user-auth
# - username/feature-description
# - epic/feature/task-name
```

**Pull Request Workflow:**
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: implement new feature"

# 3. Keep branch updated
git fetch origin
git rebase origin/main        # Or merge

# 4. Push branch
git push -u origin feature/new-feature

# 5. Create Pull Request (on GitHub/GitLab/etc.)

# 6. Address review feedback
git add .
git commit -m "fix: address review comments"
git push

# 7. After merge, clean up
git checkout main
git pull origin main
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

## Common Workflows

### Fixing Mistakes

**Undo Last Commit (not pushed):**
```bash
# Keep changes staged
git reset --soft HEAD~1

# Keep changes unstaged
git reset HEAD~1

# Discard changes completely
git reset --hard HEAD~1
```

**Amend Last Commit:**
```bash
# Change commit message
git commit --amend -m "new message"

# Add forgotten files
git add forgotten-file.txt
git commit --amend --no-edit
```

**Revert Commit (already pushed):**
```bash
# Create new commit that undoes changes
git revert commit-hash

# Revert multiple commits
git revert commit1 commit2 commit3

# Revert merge commit
git revert -m 1 merge-commit-hash
```

**Recover Deleted Files:**
```bash
# File deleted but not committed
git checkout HEAD file.txt

# File deleted and committed
git log --all --full-history -- file.txt
git checkout commit-hash -- file.txt
```

### Cleaning Repository

**Remove Untracked Files:**
```bash
# Dry run
git clean -n

# Remove files
git clean -f

# Remove files and directories
git clean -fd

# Remove files, directories, and ignored files
git clean -fdx
```

**Prune Branches:**
```bash
# Remove remote-tracking branches that no longer exist
git fetch --prune

# Delete merged branches
git branch --merged | grep -v "\*" | xargs -n 1 git branch -d
```

**Reduce Repository Size:**
```bash
# Remove file from history (CAUTION: rewrites history)
git filter-branch --tree-filter 'rm -f large-file.bin' HEAD

# Better: use git-filter-repo
pip install git-filter-repo
git filter-repo --path large-file.bin --invert-paths

# Garbage collection
git gc --aggressive --prune=now
```

## Troubleshooting

**Common Issues:**
```bash
# Detached HEAD state
git checkout -b temp-branch    # Create branch from detached HEAD

# Accidentally committed to main instead of branch
git branch feature-branch      # Create branch at current commit
git reset --hard origin/main   # Reset main to remote
git checkout feature-branch    # Switch to feature branch

# Need to pull but have local changes
git stash
git pull
git stash pop

# Push rejected (non-fast-forward)
git pull --rebase origin main
git push

# Large files stuck in history
git filter-repo --strip-blobs-bigger-than 10M

# Corrupted repository
git fsck --full                # Check for corruption
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Approach

When working with Git:

1. **Commit Often**: Small, atomic commits are easier to manage
2. **Write Clear Messages**: Follow conventional commit format
3. **Keep History Clean**: Use rebase for feature branches
4. **Never Rewrite Public History**: Don't force push to shared branches
5. **Review Before Pushing**: Check diff and status
6. **Use Branches**: One feature = one branch
7. **Pull Before Push**: Stay synchronized with team
8. **Resolve Conflicts Carefully**: Understand both changes

Always use Git workflows that match your team's conventions and maintain a clean, understandable project history.
