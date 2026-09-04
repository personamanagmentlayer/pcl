# Audit Expert — Security Code Review

Reference material for the `audit-expert` skill. See [SKILL.md](../SKILL.md).

## Security Code Review

### Authentication Review

```javascript
// ❌ Issues to flag
class AuthService {
  // Issue 1: Weak password requirements
  validatePassword(password) {
    return password.length >= 6; // Too short!
  }

  // Issue 2: Password stored in plaintext
  async createUser(email, password) {
    await db.users.create({ email, password }); // No hashing!
  }

  // Issue 3: Timing attack vulnerability
  async login(email, password) {
    const user = await db.users.findOne({ email });
    if (!user) return null;

    // Direct comparison reveals timing
    if (user.password === password) {
      return user;
    }
    return null;
  }

  // Issue 4: No rate limiting
  // Issue 5: No MFA support
  // Issue 6: Predictable session tokens
  generateSessionToken() {
    return Math.random().toString(36); // Not cryptographically secure!
  }
}

// ✅ Secure implementation
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class SecureAuthService {
  // Strong password validation
  validatePassword(password) {
    const minLength = 12;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    return (
      password.length >= minLength &&
      hasUppercase &&
      hasLowercase &&
      hasNumber &&
      hasSpecial
    );
  }

  // Secure password hashing
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async createUser(email, password) {
    if (!this.validatePassword(password)) {
      throw new Error('Password does not meet requirements');
    }

    const passwordHash = await this.hashPassword(password);
    await db.users.create({
      email: email.toLowerCase(),
      passwordHash,
    });
  }

  // Constant-time comparison with rate limiting
  async login(email, password) {
    // Check rate limit
    const attempts = await this.getLoginAttempts(email);
    if (attempts > 5) {
      throw new Error('Too many login attempts. Try again later.');
    }

    const user = await db.users.findOne({
      email: email.toLowerCase(),
    });

    // Always hash password even if user not found (timing attack prevention)
    const isValid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, '$2b$12$dummyhash');

    if (!user || !isValid) {
      await this.recordFailedAttempt(email);
      throw new Error('Invalid credentials');
    }

    await this.clearLoginAttempts(email);
    return user;
  }

  // Cryptographically secure tokens
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // MFA support
  async verifyMFA(user, token) {
    const speakeasy = require('speakeasy');
    return speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }
}
```

### SQL Injection Review

```javascript
// Audit checklist for SQL injection:
// 1. Are all queries parameterized?
// 2. Is user input sanitized?
// 3. Are ORM features used correctly?
// 4. Are stored procedures parameterized?

// ❌ Vulnerable patterns to flag
async function searchUsers(name) {
  // Issue: String concatenation
  const query = `SELECT * FROM users WHERE name = '${name}'`;
  return await db.query(query);
}

async function updateUser(id, data) {
  // Issue: Dynamic column names not validated
  const columns = Object.keys(data).join(', ');
  const query = `UPDATE users SET ${columns} WHERE id = ${id}`;
  return await db.query(query);
}

// ❌ ORM misuse
async function findUsers(filters) {
  // Issue: Raw WHERE clause from user input
  return await User.findAll({
    where: db.literal(filters.where),
  });
}

// ✅ Secure patterns
async function searchUsers(name) {
  // Parameterized query
  return await db.query('SELECT * FROM users WHERE name = ?', [name]);
}

async function updateUser(id, data) {
  // Whitelist allowed columns
  const allowedColumns = ['name', 'email', 'bio'];
  const updates = {};

  for (const [key, value] of Object.entries(data)) {
    if (allowedColumns.includes(key)) {
      updates[key] = value;
    }
  }

  return await User.update(updates, {
    where: { id },
  });
}

async function findUsers(filters) {
  // Use ORM query builder
  return await User.findAll({
    where: {
      name: { [Op.like]: `%${filters.name}%` },
      active: true,
    },
  });
}
```

### Authorization Review

```javascript
// Audit checklist:
// 1. Is authentication checked before authorization?
// 2. Are resource ownership checks present?
// 3. Is role-based access control implemented?
// 4. Are there direct object reference vulnerabilities?

// ❌ Insecure patterns
app.delete('/api/posts/:id', authenticate, async (req, res) => {
  // Issue: No authorization check!
  await Post.delete(req.params.id);
  res.status(204).send();
});

app.get('/api/documents/:id', async (req, res) => {
  // Issue: No authentication at all!
  const doc = await Document.findById(req.params.id);
  res.json(doc);
});

// ✅ Secure patterns
const authorize = (resource) => async (req, res, next) => {
  const item = await db[resource].findById(req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Check ownership or admin role
  if (item.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.resource = item;
  next();
};

app.delete(
  '/api/posts/:id',
  authenticate,
  authorize('posts'),
  async (req, res) => {
    await req.resource.delete();
    res.status(204).send();
  }
);

// Role-based access control
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };

app.post(
  '/api/admin/users',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    // Admin-only endpoint
  }
);
```

### XSS and Output Encoding Review

```javascript
// Audit checklist:
// 1. Is user input escaped in HTML context?
// 2. Is Content-Security-Policy header set?
// 3. Are dangerous functions (eval, innerHTML) avoided?
// 4. Is templating engine auto-escaping enabled?

// ❌ Vulnerable patterns
app.get('/search', (req, res) => {
  // Issue: No escaping
  res.send(`<h1>Results for: ${req.query.q}</h1>`);
});

app.post('/comment', async (req, res) => {
  // Issue: Storing unsanitized HTML
  await Comment.create({
    text: req.body.comment,
    html: req.body.comment, // Dangerous!
  });
});

// Client-side issues
function displayComment(comment) {
  // Issue: Using innerHTML
  document.getElementById('comment').innerHTML = comment;

  // Issue: Using eval
  eval(comment);
}

// ✅ Secure patterns
const escape = require('escape-html');

app.get('/search', (req, res) => {
  res.send(`<h1>Results for: ${escape(req.query.q)}</h1>`);
});

// Or use templating with auto-escape
app.get('/search', (req, res) => {
  res.render('search', { query: req.query.q }); // Auto-escaped
});

// Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:;"
  );
  next();
});

// Client-side: Use textContent
function displayComment(comment) {
  document.getElementById('comment').textContent = comment;
}
```
