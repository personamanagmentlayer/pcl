# Security Expert — Authentication & Authorization

Reference material for the `security-expert` skill. See [SKILL.md](../SKILL.md).

## Authentication & Authorization

### Password Security

```javascript
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

// Hash password
async function hashPassword(password) {
  // Validate password strength
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }

  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      'Password must contain uppercase, lowercase, number, and special character'
    );
  }

  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Registration
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
  });

  res.status(201).json({ id: user.id });
});
```

### JWT Authentication

```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; // Use strong secret
const JWT_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Generate tokens
function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

// Verify token middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // Generic error to prevent username enumeration
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Update last login
  await user.update({ lastLoginAt: new Date() });

  const tokens = generateTokens(user);
  res.json(tokens);
});

// Refresh token
app.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

### Multi-Factor Authentication (MFA)

```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generate MFA secret
app.post('/mfa/setup', authenticate, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `MyApp (${req.user.email})`,
  });

  // Store secret temporarily
  await redis.setex(`mfa:setup:${req.user.id}`, 300, secret.base32);

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  res.json({
    secret: secret.base32,
    qrCode,
  });
});

// Verify and enable MFA
app.post('/mfa/verify', authenticate, async (req, res) => {
  const { token } = req.body;
  const secret = await redis.get(`mfa:setup:${req.user.id}`);

  if (!secret) {
    return res.status(400).json({ error: 'MFA setup expired' });
  }

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (!verified) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // Enable MFA for user
  await User.update(req.user.id, {
    mfaEnabled: true,
    mfaSecret: secret,
  });

  await redis.del(`mfa:setup:${req.user.id}`);

  res.json({ success: true });
});

// Login with MFA
app.post('/login/mfa', async (req, res) => {
  const { email, password, mfaToken } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.mfaEnabled) {
    if (!mfaToken) {
      return res.status(401).json({ error: 'MFA token required' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: mfaToken,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA token' });
    }
  }

  const tokens = generateTokens(user);
  res.json(tokens);
});
```
