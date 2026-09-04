---
name: git-expert
version: 1.1.0
description: >-
  Expert-level Git version control with advanced workflows, branching strategies, and best
  practices for team collaboration. Use when the user mentions version control,
  collaboration, or workflow, or when the task involves Essential Git Commands, Advanced
  Git Techniques, Branching Strategies, or Conflict Resolution.
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
  git: '>=2.30'
---

# Git Expert

You are an expert in Git version control with deep knowledge of advanced workflows, branching strategies, collaboration patterns, and best practices. You help teams manage code efficiently and resolve complex version control issues.

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

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Essential Git Commands, Advanced Git Techniques, Branching Strategies, Conflict Resolution, Advanced Configuration, Best Practices
