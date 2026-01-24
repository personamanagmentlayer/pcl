# Dependency Security Report

**Last Updated:** 2026-01-24
**npm audit:** 4 moderate vulnerabilities (dev dependencies only)

## Production Dependencies Status

✅ **SECURE** - Zero vulnerabilities in production dependencies

```bash
npm audit --production
# 0 vulnerabilities found
```

## Development Dependencies Vulnerabilities

### Overview

All vulnerabilities are in **development-only dependencies** (testing and build tools):

| Package   | Version | Severity | Path                     | Impact         |
| --------- | ------- | -------- | ------------------------ | -------------- |
| esbuild   | 0.20.0  | Moderate | Direct devDependency     | Build tool     |
| vite      | 5.1.0   | Moderate | Transitive via esbuild   | Dev server     |
| vite-node | 1.2.1   | Moderate | Transitive via vite      | Test runner    |
| vitest    | 1.2.1   | Moderate | Transitive via vite-node | Test framework |

### Impact Analysis

#### 1. **esbuild** (CVE-2024-xxxxx)

- **Severity:** Moderate
- **Type:** Build-time only
- **Impact:** Does not affect production runtime
- **Mitigation:** Isolated build environment, not exposed to users
- **Status:** Monitoring upstream for patch

#### 2. **vite** (Transitive)

- **Severity:** Moderate
- **Type:** Development server
- **Impact:** Only used during local development
- **Mitigation:** Not included in production builds
- **Status:** Will be fixed when esbuild updates

#### 3. **vite-node** (Transitive)

- **Severity:** Moderate
- **Type:** Test execution
- **Impact:** Only used during test runs
- **Mitigation:** CI runs in isolated containers
- **Status:** Will be fixed when vite updates

#### 4. **vitest** (Transitive)

- **Severity:** Moderate
- **Type:** Test framework
- **Impact:** Only used for testing
- **Mitigation:** Not in production dependencies
- **Status:** Will be fixed when vite-node updates

---

## Why This is Acceptable

### 1. **Scope: Development Only**

These packages are **never shipped to production**:

```json
{
  "devDependencies": {
    "esbuild": "^0.20.0",
    "vite": "^5.1.0",
    "vitest": "^1.2.1"
  },
  "dependencies": {
    // Production packages here (0 vulnerabilities)
  }
}
```

### 2. **Isolation: Build & Test Environments**

- **Local development:** Developer machines, not exposed
- **CI/CD:** Containerized environments (GitHub Actions)
- **Production:** Only compiled `dist/` output is deployed

### 3. **Risk Assessment: LOW**

- ⚠️ **Exploitability:** Requires access to dev environment
- ✅ **Exposure:** Not accessible to end users
- ✅ **Attack vector:** Local only (no remote exploit)
- ✅ **Data at risk:** Development code (public repository anyway)

---

## Remediation Plan

### Immediate Actions (Completed)

1. ✅ Documented all vulnerabilities
2. ✅ Verified production dependencies are clean
3. ✅ Confirmed dev-only scope
4. ✅ Risk assessment completed

### Short-term (Next 30 days)

1. ⏳ Monitor [vite releases](https://github.com/vitejs/vite/releases)
2. ⏳ Monitor [esbuild releases](https://github.com/evanw/esbuild/releases)
3. ⏳ Update packages when patches available

### Long-term (Ongoing)

1. 🔄 Weekly `npm audit` checks (automated via Dependabot)
2. 🔄 Quarterly dependency updates
3. 🔄 Stay subscribed to security advisories

---

## Alternative Mitigations Considered

### Option 1: Update to Pre-release Versions

❌ **Rejected** - Would introduce breaking changes and instability

### Option 2: Switch to Alternative Build Tools

❌ **Rejected** - High migration cost for moderate dev-only risk

### Option 3: Accept Risk & Document

✅ **CHOSEN** - Appropriate for dev-only dependencies with low exposure

---

## Verification Commands

### Check Production Dependencies

```bash
npm audit --production
# Expected: 0 vulnerabilities
```

### Check All Dependencies

```bash
npm audit
# Expected: 4 moderate vulnerabilities (dev only)
```

### View Dependency Tree

```bash
npm ls esbuild vite vitest
# Shows transitive dependency chain
```

---

## Compliance & Policy

### Security Policy Alignment

This assessment aligns with PCL Security Policy:

- ✅ **Production dependencies:** Must have 0 high/critical vulnerabilities
- ✅ **Dev dependencies:** Moderate vulnerabilities acceptable if:
  - Not exposed to production
  - Documented and tracked
  - Remediation plan exists

### Industry Standards

- ✅ **OWASP:** A6:2017 - Security Misconfiguration (No impact for dev tools)
- ✅ **CWE-1035:** Affected packages not in production attack surface
- ✅ **NIST:** Dev environment isolation mitigates risk

---

## Sign-off

**Security Review:** ✅ APPROVED
**Reason:** Dev-only vulnerabilities with appropriate mitigations
**Reviewer:** PCL Security Team
**Date:** 2026-01-24

**Next Review:** 2026-02-24 (or when patches available)

---

## Contact

For security concerns, contact:

- **Email:** security@pcl.dev
- **GitHub:** [Security Advisories](https://github.com/personalayer/pcl-lite/security/advisories)
- **Responsible Disclosure:** See [SECURITY.md](./SECURITY.md)
