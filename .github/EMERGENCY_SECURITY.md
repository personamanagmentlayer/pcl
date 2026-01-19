# 🚨 Emergency Security Commands - Quick Reference

## Immediate Threat Response

### 1. Check Recent Activity (Last 24 Hours)

```bash
# View recent events
gh api /repos/personamanagmentlayer/pcl/events --jq '.[] | {type, actor: .actor.login, created_at}' | Select-Object -First 20

# Check recent commits
git log --all --oneline --author-date-order --since="24 hours ago"

# Check who pushed recently
git log --all --pretty=format:"%h %an %ae %s" --since="24 hours ago"
```

### 2. Remove Suspicious Collaborator

```bash
# List all collaborators
gh api /repos/personamanagmentlayer/pcl/collaborators --jq '.[] | {login: .login, role: .role_name}'

# Remove a user (REPLACE 'USERNAME')
gh api -X DELETE /repos/personamanagmentlayer/pcl/collaborators/USERNAME

# Verify removal
gh api /repos/personamanagmentlayer/pcl/collaborators --jq '.[].login'
```

### 3. Check for Leaked Secrets

```bash
# Check GitHub secret scanning alerts
gh api /repos/personamanagmentlayer/pcl/secret-scanning/alerts

# Run local Gitleaks scan (install from: https://github.com/gitleaks/gitleaks)
# Windows: choco install gitleaks
# Then run:
gitleaks detect -v

# Check npm audit
npm audit
```

### 4. Protect Branches Immediately

```bash
# Lock main branch completely (emergency only)
gh api -X PUT /repos/personamanagmentlayer/pcl/branches/main/protection/lock -f enabled=true

# Unlock when safe
gh api -X DELETE /repos/personamanagmentlayer/pcl/branches/main/protection/lock
```

### 5. Revoke and Refresh Credentials

```bash
# Refresh GitHub CLI authentication
gh auth logout
gh auth login

# Rotate Personal Access Tokens
# Go to: https://github.com/settings/tokens
# Delete compromised token, create new one

# Update Git credentials
git config --global credential.helper manager
```

### 6. Check for Unauthorized Webhooks

```bash
# List all webhooks
gh api /repos/personamanagmentlayer/pcl/hooks --jq '.[] | {id, name, config: .config.url}'

# Delete suspicious webhook (REPLACE 'HOOK_ID')
gh api -X DELETE /repos/personamanagmentlayer/pcl/hooks/HOOK_ID
```

### 7. Review GitHub Actions Runs

```bash
# Check recent workflow runs
gh run list --limit 20

# View specific run logs (REPLACE 'RUN_ID')
gh run view RUN_ID --log

# Cancel suspicious running workflow (REPLACE 'RUN_ID')
gh run cancel RUN_ID
```

### 8. Force Logout All Sessions (Your Account)

```bash
# Go to GitHub settings
Start-Process "https://github.com/settings/sessions"

# Review sessions and revoke suspicious ones
# Enable 2FA if not already enabled: https://github.com/settings/security
```

---

## Monitoring Commands

### Daily Health Check

```bash
# Run this daily to check repository health
gh api /repos/personamanagmentlayer/pcl --jq '{
  name: .name,
  visibility: .visibility,
  secret_scanning: .security_and_analysis.secret_scanning.status,
  push_protection: .security_and_analysis.secret_scanning_push_protection.status,
  updated_at: .updated_at,
  pushed_at: .pushed_at
}'

# Check branch protection status
gh api /repos/personamanagmentlayer/pcl/branches/main/protection --jq '{
  required_reviews: .required_pull_request_reviews.required_approving_review_count,
  enforce_admins: .enforce_admins.enabled,
  force_push: .allow_force_pushes.enabled,
  deletions: .allow_deletions.enabled
}'
```

### Check Dependabot Alerts

```bash
# List security alerts
gh api /repos/personamanagmentlayer/pcl/dependabot/alerts

# View specific alert details (REPLACE 'ALERT_NUMBER')
gh api /repos/personamanagmentlayer/pcl/dependabot/alerts/ALERT_NUMBER
```

### Audit Organization Activity

```bash
# Check organization audit log (requires org admin)
gh api '/orgs/personamanagmentlayer/audit-log?per_page=10' --jq '.[] | {
  action,
  actor: .actor,
  created_at,
  repo: .repo
}'
```

---

## Recovery Commands

### Revert Suspicious Commits

```bash
# Find commit SHA of last known good state
git log --oneline --graph --all

# Create recovery branch
git checkout -b security-recovery

# Revert specific commit (REPLACE 'COMMIT_SHA')
git revert COMMIT_SHA

# Or reset to last good commit (REPLACE 'COMMIT_SHA')
git reset --hard COMMIT_SHA

# Force push to recovery branch
git push origin security-recovery --force
```

### Restore from Backup

```bash
# Clone fresh copy from GitHub
cd C:\Temp
gh repo clone personamanagmentlayer/pcl pcl-backup

# Compare with local version
# Use your favorite diff tool
```

### Re-enable Security Features (If Disabled)

```bash
# Re-enable secret scanning
gh api -X PATCH /repos/personamanagmentlayer/pcl \
  -F security_and_analysis[secret_scanning][status]=enabled \
  -F security_and_analysis[secret_scanning_push_protection][status]=enabled

# Re-apply branch protection
gh api -X PUT /repos/personamanagmentlayer/pcl/branches/main/protection \
  --input .github/branch-protection.json
```

---

## Contact Information

**Emergency Security Contact**: security@pcl-lang.org  
**GitHub Security Advisory**: https://github.com/personamanagmentlayer/pcl/security/advisories/new  
**Response Time**: Within 48 hours

---

## Prevention Checklist

- [ ] Enable 2FA on all admin accounts
- [ ] Use SSH keys for Git operations
- [ ] Sign all commits with GPG
- [ ] Rotate Personal Access Tokens every 90 days
- [ ] Review collaborators monthly
- [ ] Monitor Dependabot alerts weekly
- [ ] Keep dependencies updated
- [ ] Never commit secrets to repository
- [ ] Use environment variables for sensitive data
- [ ] Review audit logs monthly

---

**Keep this document accessible for emergency response!**
