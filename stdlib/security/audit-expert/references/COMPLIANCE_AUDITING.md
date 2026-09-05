# Audit Expert — Compliance Auditing

Reference material for the `audit-expert` skill. See [SKILL.md](../SKILL.md).

## Compliance Auditing

### GDPR Compliance Checklist

```javascript
// GDPR Requirements Audit

// 1. Lawful Basis for Processing
// ✓ Explicit consent obtained
// ✓ Purpose clearly stated
// ✓ Option to withdraw consent

// 2. Data Minimization
// Review: Are we collecting only necessary data?
async function createUser(data) {
  // ❌ Collecting too much
  const user = {
    email: data.email,
    password: data.password,
    ssn: data.ssn, // Unnecessary!
    medicalHistory: data.medical, // Unnecessary!
    location: data.location, // May be unnecessary
  };

  // ✅ Only essential data
  const user = {
    email: data.email,
    passwordHash: await hashPassword(data.password),
  };
}

// 3. Right to Access (Subject Access Request)
app.get('/api/gdpr/data', authenticate, async (req, res) => {
  const userData = {
    personalInfo: await User.findById(req.user.id),
    posts: await Post.findByUserId(req.user.id),
    comments: await Comment.findByUserId(req.user.id),
    loginHistory: await LoginHistory.findByUserId(req.user.id),
  };

  res.json(userData);
});

// 4. Right to Erasure (Right to be Forgotten)
app.delete('/api/gdpr/delete-account', authenticate, async (req, res) => {
  const userId = req.user.id;

  await db.transaction(async (tx) => {
    // Anonymize or delete personal data
    await User.anonymize(userId, tx);
    await Post.anonymizeByUser(userId, tx);
    await Comment.anonymizeByUser(userId, tx);

    // Keep audit logs (legal requirement)
    await AuditLog.create(
      {
        action: 'account_deletion',
        userId,
        timestamp: new Date(),
      },
      tx
    );
  });

  res.status(204).send();
});

// 5. Right to Data Portability
app.get('/api/gdpr/export', authenticate, async (req, res) => {
  const data = await exportUserData(req.user.id);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
  res.json(data);
});

// 6. Breach Notification (72 hours)
async function handleDataBreach(breach) {
  // Log breach
  await SecurityIncident.create({
    type: 'data_breach',
    severity: breach.severity,
    affectedUsers: breach.userIds.length,
    detectedAt: new Date(),
  });

  // Notify authorities within 72 hours if high risk
  if (breach.severity === 'high') {
    await notifyDataProtectionAuthority(breach);
  }

  // Notify affected users
  for (const userId of breach.userIds) {
    await notifyUserOfBreach(userId, breach);
  }
}

// 7. Privacy by Design
// - Encryption at rest and in transit
// - Access controls
// - Audit logging
// - Data retention policies

// 8. Data Processing Agreement
// - Document third-party processors
// - Ensure processor compliance
// - Review contracts
```

### SOC 2 Compliance Audit

```javascript
// SOC 2 Trust Service Criteria

// 1. Security - Access Control
class AccessControlAudit {
  async auditUserAccess() {
    // Review user permissions
    const users = await User.findAll();
    const issues = [];

    for (const user of users) {
      // Check for overprivileged users
      if (user.role === 'admin' && !user.adminJustification) {
        issues.push({
          type: 'excessive_privilege',
          user: user.email,
          message: 'Admin access without justification',
        });
      }

      // Check for inactive users with access
      const daysSinceLogin = daysBetween(user.lastLoginAt, new Date());
      if (daysSinceLogin > 90) {
        issues.push({
          type: 'stale_access',
          user: user.email,
          message: `No login for ${daysSinceLogin} days`,
        });
      }
    }

    return issues;
  }

  async auditAPIKeys() {
    const apiKeys = await APIKey.findAll();
    const issues = [];

    for (const key of apiKeys) {
      // Check for keys without expiration
      if (!key.expiresAt) {
        issues.push({
          type: 'no_expiration',
          keyId: key.id,
          message: 'API key has no expiration',
        });
      }

      // Check for unused keys
      if (!key.lastUsedAt || daysBetween(key.lastUsedAt, new Date()) > 90) {
        issues.push({
          type: 'unused_key',
          keyId: key.id,
          message: 'API key not used in 90 days',
        });
      }
    }

    return issues;
  }
}

// 2. Availability - Monitoring
class AvailabilityAudit {
  async auditMonitoring() {
    const checks = [
      { name: 'Health checks configured', check: this.hasHealthChecks },
      { name: 'Uptime monitoring active', check: this.hasUptimeMonitoring },
      { name: 'Alert policies defined', check: this.hasAlertPolicies },
      { name: 'On-call rotation configured', check: this.hasOnCallRotation },
      { name: 'Backup systems tested', check: this.hasBackupTesting },
    ];

    const results = await Promise.all(
      checks.map(async (check) => ({
        name: check.name,
        passed: await check.check(),
      }))
    );

    return results;
  }
}

// 3. Processing Integrity - Data Validation
class ProcessingIntegrityAudit {
  async auditDataValidation() {
    // Review all API endpoints for input validation
    const endpoints = [
      { path: '/api/users', method: 'POST' },
      { path: '/api/posts', method: 'POST' },
      // ... all endpoints
    ];

    const issues = [];

    for (const endpoint of endpoints) {
      const hasValidation = await this.checkValidation(endpoint);
      if (!hasValidation) {
        issues.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          message: 'Missing input validation',
        });
      }
    }

    return issues;
  }
}

// 4. Confidentiality - Encryption Audit
class ConfidentialityAudit {
  async auditEncryption() {
    const issues = [];

    // Check encryption at rest
    const tables = await this.getDatabaseTables();
    for (const table of tables) {
      if (table.containsSensitiveData && !table.encrypted) {
        issues.push({
          type: 'encryption_at_rest',
          table: table.name,
          message: 'Sensitive data not encrypted',
        });
      }
    }

    // Check TLS configuration
    const tlsConfig = await this.getTLSConfig();
    if (tlsConfig.version < '1.2') {
      issues.push({
        type: 'weak_tls',
        message: 'TLS version below 1.2',
      });
    }

    // Check for hardcoded secrets
    const secrets = await this.scanForHardcodedSecrets();
    if (secrets.length > 0) {
      issues.push({
        type: 'hardcoded_secrets',
        count: secrets.length,
        message: 'Found hardcoded secrets in code',
      });
    }

    return issues;
  }
}

// 5. Privacy - Data Retention
class PrivacyAudit {
  async auditDataRetention() {
    // Check for data retention policies
    const policies = await DataRetentionPolicy.findAll();
    const issues = [];

    if (policies.length === 0) {
      issues.push({
        type: 'no_retention_policy',
        message: 'No data retention policies defined',
      });
    }

    // Check for old data
    const oldRecords = await this.findOldRecords();
    for (const record of oldRecords) {
      issues.push({
        type: 'old_data',
        table: record.table,
        count: record.count,
        message: `${record.count} records older than retention period`,
      });
    }

    return issues;
  }
}
```

### PCI-DSS Compliance

```javascript
// PCI-DSS Requirements for Payment Card Data

// 1. Never store sensitive authentication data after authorization
// ❌ Don't store:
// - Full magnetic stripe data
// - CVV2/CVC2/CID
// - PIN/PIN blocks

// ✅ Can store (encrypted):
// - Primary Account Number (PAN)
// - Cardholder name
// - Expiration date
// - Service code

class PCICompliantPayment {
  async processPayment(cardData) {
    // ❌ Never log card data
    // console.log('Processing card:', cardData); // VIOLATION!

    // ✅ Use payment processor (tokenization)
    const token = await stripe.tokens.create({
      card: {
        number: cardData.number,
        exp_month: cardData.expMonth,
        exp_year: cardData.expYear,
        cvc: cardData.cvc,
      },
    });

    // Store only token, not actual card data
    await Payment.create({
      userId: cardData.userId,
      amount: cardData.amount,
      stripeToken: token.id,
      last4: cardData.number.slice(-4), // OK to store
      // ❌ Don't store: cardNumber, cvv, etc.
    });

    const charge = await stripe.charges.create({
      amount: cardData.amount,
      currency: 'usd',
      source: token.id,
    });

    return charge;
  }

  async auditCardDataStorage() {
    // Scan database for potential card data
    const suspiciousColumns = ['card_number', 'cvv', 'pin', 'magnetic_stripe'];

    const issues = [];
    const tables = await this.getDatabaseTables();

    for (const table of tables) {
      for (const column of table.columns) {
        if (suspiciousColumns.includes(column.name.toLowerCase())) {
          issues.push({
            type: 'potential_card_data_storage',
            table: table.name,
            column: column.name,
            message: 'Possible storage of prohibited card data',
          });
        }
      }
    }

    return issues;
  }
}

// 2. Mask PAN when displayed
function maskCardNumber(pan) {
  // Show only last 4 digits
  return `****-****-****-${pan.slice(-4)}`;
}

// 3. Encryption of cardholder data
// - Use strong cryptography (AES-256)
// - Secure key management
// - Keys separate from data
```
