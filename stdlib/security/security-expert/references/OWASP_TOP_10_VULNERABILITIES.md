# Security Expert — OWASP Top 10 Vulnerabilities

Reference material for the `security-expert` skill. See [SKILL.md](../SKILL.md).

## OWASP Top 10 Vulnerabilities

### 1. Broken Access Control

```javascript
// ❌ Vulnerable: No authorization check
app.get('/api/users/:id/profile', async (req, res) => {
  const profile = await db.users.findById(req.params.id);
  res.json(profile);
});

// ✅ Secure: Verify user owns the resource
app.get('/api/users/:id/profile', authenticate, async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const profile = await db.users.findById(req.params.id);
  res.json(profile);
});

// ✅ Better: Use middleware
const authorizeResource = (resourceType) => async (req, res, next) => {
  const resourceId = req.params.id;
  const resource = await db[resourceType].findById(resourceId);

  if (!resource) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (resource.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.resource = resource;
  next();
};

app.delete(
  '/api/posts/:id',
  authenticate,
  authorizeResource('posts'),
  async (req, res) => {
    await req.resource.delete();
    res.status(204).send();
  }
);
```

### 2. Injection (SQL, NoSQL, Command)

```javascript
// ❌ SQL Injection vulnerability
app.get('/users', (req, res) => {
  const query = `SELECT * FROM users WHERE name = '${req.query.name}'`;
  db.query(query, (err, results) => {
    res.json(results);
  });
});
// Attack: ?name=' OR '1'='1

// ✅ Secure: Use parameterized queries
app.get('/users', async (req, res) => {
  const results = await db.query('SELECT * FROM users WHERE name = ?', [
    req.query.name,
  ]);
  res.json(results);
});

// ❌ Command Injection
const { exec } = require('child_process');
app.post('/convert', (req, res) => {
  exec(`convert ${req.body.filename} output.pdf`, (err, stdout) => {
    res.send(stdout);
  });
});
// Attack: filename="; rm -rf / #"

// ✅ Secure: Use safe APIs, validate input
const { spawn } = require('child_process');
app.post('/convert', (req, res) => {
  const filename = path.basename(req.body.filename); // Remove path traversal
  if (!/^[a-zA-Z0-9_-]+\.(jpg|png)$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const process = spawn('convert', [filename, 'output.pdf']);
  // Handle process output safely
});

// ❌ NoSQL Injection (MongoDB)
app.post('/login', async (req, res) => {
  const user = await User.findOne({
    username: req.body.username,
    password: req.body.password,
  });
});
// Attack: {"username": {"$ne": null}, "password": {"$ne": null}}

// ✅ Secure: Sanitize input, use proper types
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create session
});
```

### 3. Cross-Site Scripting (XSS)

```javascript
// ❌ Reflected XSS
app.get('/search', (req, res) => {
  res.send(`<h1>Results for: ${req.query.q}</h1>`);
});
// Attack: ?q=<script>alert(document.cookie)</script>

// ✅ Secure: Escape output
const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

app.get('/search', (req, res) => {
  res.send(`<h1>Results for: ${escapeHtml(req.query.q)}</h1>`);
});

// ✅ Better: Use templating engine with auto-escaping
app.get('/search', (req, res) => {
  res.render('search', { query: req.query.q }); // Automatically escaped
});

// ✅ Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  );
  next();
});
```

### 4. Cross-Site Request Forgery (CSRF)

```javascript
// ❌ Vulnerable: No CSRF protection
app.post('/api/transfer', authenticate, async (req, res) => {
  await transferMoney(req.user.id, req.body.to, req.body.amount);
  res.json({ success: true });
});

// ✅ Secure: Use CSRF tokens
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.get('/transfer', csrfProtection, (req, res) => {
  res.render('transfer', { csrfToken: req.csrfToken() });
});

app.post('/api/transfer', csrfProtection, authenticate, async (req, res) => {
  await transferMoney(req.user.id, req.body.to, req.body.amount);
  res.json({ success: true });
});

// ✅ Also use SameSite cookies
app.use(
  session({
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    },
  })
);
```

### 5. Security Misconfiguration

```javascript
// ❌ Exposed sensitive information
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack, // Exposes internal details
  });
});

// ✅ Secure: Generic error messages
app.use((err, req, res, next) => {
  console.error(err); // Log internally

  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ✅ Security headers
const helmet = require('helmet');
app.use(helmet());

// ✅ Disable unnecessary features
app.disable('x-powered-by');

// ✅ Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```
