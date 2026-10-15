// Mock API for local development only.
// JSON Server's default router isn't mounted on purpose - it would let anyone
// read or patch any record. Every endpoint below checks the token and role.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');

const PORT = Number(process.env.PORT ?? 3000);
// dev-only key, protects nothing real
const JWT_SECRET = process.env.MOCK_JWT_SECRET ?? 'DEV_SECRET';
// e.g. ACCESS_TOKEN_TTL=20s npm run mock-api to test the refresh flow
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? '5m';
const REFRESH_TOKEN_TTL = '8h';
const REFRESH_DELAY_MS = 200;

const STATUSES = ['DRAFT', 'SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'];
const BUSINESS_TYPES = [
  'RETAIL', 'FOOD_BEVERAGE', 'IMPORT_EXPORT', 'SOFTWARE', 'SERVICES', 'TRAVEL', 'HEALTHCARE', 'OTHER',
];
// no SSN / tax id / bank details in drafts
const DRAFT_FIELDS = ['businessName', 'businessType', 'annualRevenue', 'ownerName', 'ownerEmail', 'ownerPhone'];

// work on a copy so db.json stays clean between runs
const seedPath = path.join(__dirname, 'db.json');
const runtimeDir = path.join(__dirname, '.data');
const runtimePath = path.join(runtimeDir, 'db.runtime.json');
fs.mkdirSync(runtimeDir, { recursive: true });
fs.copyFileSync(seedPath, runtimePath);

const db = jsonServer.router(runtimePath).db;

// refresh token ids that are still valid (logout removes them)
const activeRefreshTokens = new Set();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const digits = (value) => String(value ?? '').replace(/\D/g, '');
const lastFour = (value) => {
  const d = digits(value);
  return d ? `****${d.slice(-4)}` : '';
};
const nowIso = () => new Date().toISOString();

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, typ: 'access', user: publicUser(user) }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function signRefreshToken(user) {
  const jti = crypto.randomUUID();
  activeRefreshTokens.add(jti);
  return jwt.sign({ sub: user.id, typ: 'refresh', jti }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

// SALES only gets last 4 digits, and no SSN at all
function toView(app, user) {
  if (user.role === 'SALES') {
    return {
      ...app,
      taxId: lastFour(app.taxId),
      bankAccount: lastFour(app.bankAccount),
      routingNumber: lastFour(app.routingNumber),
      ownerSsn: null,
    };
  }
  return app;
}

function canView(app, user) {
  switch (user.role) {
    case 'ADMIN':
      return true;
    case 'SALES':
      return app.submittedBy === user.id;
    case 'REVIEWER':
      return app.assignedReviewer === user.id;
    default:
      return false;
  }
}

function validateApplication(body) {
  const errors = {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  if (str(body.businessName).length < 2 || str(body.businessName).length > 120) errors.businessName = 'invalid';
  if (!BUSINESS_TYPES.includes(body.businessType)) errors.businessType = 'invalid';
  const revenue = Number(body.annualRevenue);
  if (!Number.isFinite(revenue) || revenue < 1 || revenue > 1_000_000_000) errors.annualRevenue = 'invalid';
  if (!/^\d{2}-?\d{7}$/.test(str(body.taxId))) errors.taxId = 'invalid';
  if (str(body.ownerName).length < 2) errors.ownerName = 'invalid';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(body.ownerEmail))) errors.ownerEmail = 'invalid';
  if (digits(body.ownerPhone).length < 7) errors.ownerPhone = 'invalid';
  if (digits(body.ownerSsn).length !== 9) errors.ownerSsn = 'invalid';
  const acct = digits(body.bankAccount).length;
  if (acct < 8 || acct > 17) errors.bankAccount = 'invalid';
  if (digits(body.routingNumber).length !== 9) errors.routingNumber = 'invalid';
  return errors;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.typ !== 'access') throw new Error('wrong token type');
    // look the role up again instead of trusting the token
    const user = db.get('users').find({ id: payload.sub }).value();
    if (!user) throw new Error('unknown user');
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Forbidden' });

const server = jsonServer.create();
server.disable('x-powered-by');
server.use(jsonServer.bodyParser);
server.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// auth
server.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  // mock: any password works for a known email
  if (typeof email !== 'string' || typeof password !== 'string' || !password) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const user = db
    .get('users')
    .find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    .value();
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });

  return res.json({
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    user: publicUser(user),
  });
});

server.post('/api/auth/refresh', async (req, res) => {
  await delay(REFRESH_DELAY_MS);
  const { refreshToken } = req.body ?? {};
  try {
    const payload = jwt.verify(String(refreshToken ?? ''), JWT_SECRET);
    if (payload.typ !== 'refresh' || !activeRefreshTokens.has(payload.jti)) throw new Error('revoked');
    const user = db.get('users').find({ id: payload.sub }).value();
    if (!user) throw new Error('unknown user');
    return res.json({ accessToken: signAccessToken(user) });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

server.post('/api/auth/logout', (req, res) => {
  const decoded = jwt.decode(String(req.body?.refreshToken ?? ''));
  if (decoded?.jti) activeRefreshTokens.delete(decoded.jti);
  res.status(204).end();
});

// users (no emails)
server.get('/api/users', requireAuth, (_req, res) => {
  res.json(
    db
      .get('users')
      .map((u) => ({ id: u.id, name: u.name, role: u.role }))
      .value(),
  );
});

// applications
server.get('/api/applications', requireAuth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
  const status = STATUSES.includes(req.query.status) ? req.query.status : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  const matches = db
    .get('applications')
    .filter((app) => canView(app, req.user))
    .filter((app) => !status || app.status === status)
    .filter(
      (app) =>
        !search ||
        app.businessName.toLowerCase().includes(search) ||
        app.ownerName.toLowerCase().includes(search),
    )
    .orderBy(['updatedAt'], ['desc'])
    .value();

  const start = (page - 1) * pageSize;
  res.json({
    data: matches.slice(start, start + pageSize).map((app) => toView(app, req.user)),
    total: matches.length,
    page,
    pageSize,
  });
});

server.get('/api/applications/:id', requireAuth, (req, res) => {
  const app = db.get('applications').find({ id: req.params.id }).value();
  // 404 instead of 403 so ids can't be probed
  if (!app || !canView(app, req.user)) return res.status(404).json({ message: 'Not found' });
  res.json(toView(app, req.user));
});

server.post('/api/applications', requireAuth, requireRole('SALES', 'ADMIN'), (req, res) => {
  const body = req.body ?? {};
  const errors = validateApplication(body);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Validation failed', errors });

  const timestamp = nowIso();
  const app = {
    id: `app-${crypto.randomUUID().slice(0, 8)}`,
    businessName: body.businessName.trim(),
    businessType: body.businessType,
    annualRevenue: Number(body.annualRevenue),
    taxId: body.taxId.trim(),
    bankAccount: digits(body.bankAccount),
    routingNumber: digits(body.routingNumber),
    ownerName: body.ownerName.trim(),
    ownerEmail: body.ownerEmail.trim(),
    ownerPhone: body.ownerPhone.trim(),
    ownerSsn: digits(body.ownerSsn).replace(/^(\d{3})(\d{2})(\d{4})$/, '$1-$2-$3'),
    status: 'SUBMITTED',
    submittedBy: req.user.id,
    assignedReviewer: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    riskHistory: [],
  };
  db.get('applications').push(app).write();
  db.get('drafts').remove({ ownerId: req.user.id }).write();
  res.status(201).json(toView(app, req.user));
});

server.patch('/api/applications/:id/assign', requireAuth, requireRole('ADMIN'), (req, res) => {
  const record = db.get('applications').find({ id: req.params.id });
  const app = record.value();
  if (!app) return res.status(404).json({ message: 'Not found' });
  if (!['SUBMITTED', 'PENDING_REVIEW'].includes(app.status)) {
    return res.status(409).json({ message: 'Only open applications can be assigned' });
  }
  const reviewer = db.get('users').find({ id: req.body?.reviewerId, role: 'REVIEWER' }).value();
  if (!reviewer) return res.status(400).json({ message: 'Unknown reviewer' });

  record.assign({ assignedReviewer: reviewer.id, status: 'PENDING_REVIEW', updatedAt: nowIso() }).write();
  res.json(toView(record.value(), req.user));
});

server.post('/api/applications/:id/review', requireAuth, requireRole('REVIEWER', 'ADMIN'), (req, res) => {
  const record = db.get('applications').find({ id: req.params.id });
  const app = record.value();
  if (!app || !canView(app, req.user)) return res.status(404).json({ message: 'Not found' });
  if (app.status !== 'PENDING_REVIEW') {
    return res.status(409).json({ message: 'Application is not awaiting review' });
  }
  const { decision } = req.body ?? {};
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  if (!['APPROVED', 'REJECTED'].includes(decision) || note.length < 10 || note.length > 2000) {
    return res.status(400).json({ message: 'A decision and a note of 10-2000 characters are required' });
  }

  const timestamp = nowIso();
  record
    .assign({
      status: decision,
      updatedAt: timestamp,
      riskHistory: [...app.riskHistory, { date: timestamp, reviewer: req.user.id, note, decision }],
    })
    .write();
  res.json(toView(record.value(), req.user));
});

// drafts - one per user
server.get('/api/drafts/mine', requireAuth, requireRole('SALES', 'ADMIN'), (req, res) => {
  const draft = db.get('drafts').find({ ownerId: req.user.id }).value();
  res.json(draft ?? null);
});

server.put('/api/drafts/mine', requireAuth, requireRole('SALES', 'ADMIN'), (req, res) => {
  const data = {};
  for (const field of DRAFT_FIELDS) {
    if (req.body?.[field] !== undefined) data[field] = req.body[field];
  }
  const draft = { ...data, id: `draft-${req.user.id}`, ownerId: req.user.id, status: 'DRAFT', updatedAt: nowIso() };
  const drafts = db.get('drafts');
  if (drafts.find({ ownerId: req.user.id }).value()) {
    drafts.find({ ownerId: req.user.id }).assign(draft).write();
  } else {
    drafts.push(draft).write();
  }
  res.json(draft);
});

server.delete('/api/drafts/mine', requireAuth, requireRole('SALES', 'ADMIN'), (req, res) => {
  db.get('drafts').remove({ ownerId: req.user.id }).write();
  res.status(204).end();
});

server.use((_req, res) => res.status(404).json({ message: 'Not found' }));
// eslint-disable-next-line no-unused-vars
server.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal error' });
});

server.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}/api (access token TTL ${ACCESS_TOKEN_TTL})`);
});
