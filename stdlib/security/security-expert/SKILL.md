---
name: security-expert
version: 1.1.0
description: >-
  Expert-level application security, OWASP Top 10, penetration testing, and security best
  practices. Use when the user mentions OWASP, pentesting, appsec, vulnerability,
  encryption, or authentication, or when the task involves Security Principles, OWASP Top
  10, Security Domains, or Broken Access Control.
category: security
tags:
  [security, owasp, pentest, appsec, vulnerability, encryption, authentication]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(nmap:*, burpsuite:*, zap:*)
---

# Security Expert

Expert guidance for application security, vulnerability assessment, penetration testing, OWASP Top 10, secure coding practices, and security architecture.

## Core Concepts

### Security Principles

- Defense in depth
- Least privilege
- Secure by default
- Fail securely
- Complete mediation
- Separation of duties
- Zero trust architecture

### OWASP Top 10 (2021)

1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

### Security Domains

- Authentication & Authorization
- Cryptography
- Input validation
- Session management
- Error handling
- Secure communications
- Data protection

## Cryptography

### Encryption at Rest

```javascript
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex'),
  };
}

function decrypt(iv, encrypted, authTag) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Store sensitive data
async function storeSensitiveData(userId, data) {
  const { iv, encrypted, authTag } = encrypt(JSON.stringify(data));

  await db.sensitiveData.create({
    userId,
    iv,
    encrypted,
    authTag,
  });
}
```

### Secure Random Generation

```javascript
// ✅ Cryptographically secure random
const crypto = require('crypto');

function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateSecureId() {
  return crypto.randomUUID();
}

// ❌ Don't use Math.random() for security
const insecureToken = Math.random().toString(36); // Predictable!
```

## Input Validation

```javascript
const { body, validationResult } = require('express-validator');

app.post(
  '/api/users',
  // Validation rules
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('age').optional().isInt({ min: 18, max: 120 }),
  body('website').optional().isURL(),

  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Process validated data
    const user = await User.create(req.body);
    res.status(201).json(user);
  }
);

// File upload validation
const multer = require('multer');

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      return cb(new Error('Invalid file extension'));
    }

    cb(null, true);
  },
});

app.post('/upload', upload.single('image'), (req, res) => {
  // Verify file content matches extension
  // Store with random filename to prevent path traversal
  const filename = `${crypto.randomUUID()}${path.extname(req.file.originalname)}`;
  // Save file...
});
```

## Security Headers

```javascript
const helmet = require('helmet');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline in production
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
    noSniff: true,
    xssFilter: true,
  })
);

// Additional headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );
  next();
});
```

## Secure Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log security events
function logSecurityEvent(event, details) {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

// Failed login attempts
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    logSecurityEvent('failed_login', {
      email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Success
  logSecurityEvent('successful_login', {
    userId: user.id,
    ip: req.ip,
  });

  // Generate tokens...
});

// ❌ Don't log sensitive data
logger.info('User data', user); // May contain passwordHash, tokens

// ✅ Sanitize before logging
logger.info('User data', {
  id: user.id,
  email: user.email,
  // Omit sensitive fields
});
```

## Best Practices

### Secure Development Lifecycle

1. Threat modeling
2. Security requirements
3. Secure coding standards
4. Code review
5. Security testing (SAST/DAST)
6. Vulnerability scanning
7. Penetration testing
8. Security monitoring

### Defense in Depth

- Multiple layers of security
- Assume breach mentality
- Principle of least privilege
- Input validation at every layer
- Output encoding
- Secure configuration

### Security Testing

- Static Application Security Testing (SAST)
- Dynamic Application Security Testing (DAST)
- Interactive Application Security Testing (IAST)
- Software Composition Analysis (SCA)
- Penetration testing
- Bug bounty programs

## Anti-Patterns to Avoid

❌ **Storing passwords in plaintext**: Always hash with bcrypt/argon2
❌ **Rolling your own crypto**: Use established libraries
❌ **Trusting user input**: Validate and sanitize everything
❌ **Exposing sensitive errors**: Use generic error messages
❌ **No rate limiting**: Implement rate limiting on all endpoints
❌ **Weak session management**: Use secure, httpOnly cookies
❌ **No logging**: Log security events for monitoring
❌ **Hardcoded secrets**: Use environment variables

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Authentication & Authorization](references/AUTHENTICATION_AUTHORIZATION.md) — Password Security, JWT Authentication, Multi-Factor Authentication (MFA)
- [OWASP Top 10 Vulnerabilities](references/OWASP_TOP_10_VULNERABILITIES.md) — Broken Access Control, Injection (SQL, NoSQL, Command), Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), Security Misconfiguration

## Resources

- OWASP: https://owasp.org/
- OWASP Top 10: https://owasp.org/Top10/
- CWE Top 25: https://cwe.mitre.org/top25/
- NIST Guidelines: https://www.nist.gov/cybersecurity
- Security Headers: https://securityheaders.com/
- SSL Labs: https://www.ssllabs.com/
