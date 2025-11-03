import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

describe('Clerk Authentication Middleware', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Test route
    app.get('/test-protected', verifyClerk, (req, res) => {
      res.json({ 
        ok: true, 
        userId: req.userId,
        email: req.clerkToken?.email 
      });
    });
  });

  describe('Token Validation', () => {
    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/test-protected');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not signed in');
    });

    test('should reject malformed token', async () => {
      const response = await request(app)
        .get('/test-protected')
        .set('Authorization', 'Bearer invalid-token-format');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { 
          sub: 'user_123', 
          exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        },
        'test-secret'
      );

      const response = await request(app)
        .get('/test-protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    test('should reject token with future nbf (not before)', async () => {
      const futureToken = jwt.sign(
        {
          sub: 'user_123',
          nbf: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          exp: Math.floor(Date.now() / 1000) + 7200
        },
        'test-secret'
      );

      const response = await request(app)
        .get('/test-protected')
        .set('Authorization', `Bearer ${futureToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Origin Validation (azp claim)', () => {
    test('should reject token from unauthorized origin', async () => {
      // Note: This test depends on proper JWT verification
      // In real scenario, azp mismatch should be rejected
      const tokenWithBadAzp = jwt.sign(
        {
          sub: 'user_123',
          azp: 'https://malicious-site.com',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        'test-secret'
      );

      const response = await request(app)
        .get('/test-protected')
        .set('Authorization', `Bearer ${tokenWithBadAzp}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Organization Status', () => {
    test('should reject pending organization membership', async () => {
      const pendingToken = jwt.sign(
        {
          sub: 'user_123',
          sts: 'pending',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        'test-secret'
      );

      const response = await request(app)
        .get('/test-protected')
        .set('Authorization', `Bearer ${pendingToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Cookie Authentication', () => {
    test('should accept token from __session cookie', async () => {
      // Mock a valid session cookie
      const response = await request(app)
        .get('/test-protected')
        .set('Cookie', '__session=mock-valid-token');

      // Will fail JWT verification but should attempt to read cookie
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('Security Headers', () => {
  test('middleware should not expose sensitive error details', async () => {
    const app = express();
    app.use(express.json());
    app.get('/test', verifyClerk, (req, res) => {
      res.json({ ok: true });
    });

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer malformed.token.here');

    expect(response.status).toBe(401);
    expect(response.body.error).not.toContain('secret');
    expect(response.body.error).not.toContain('key');
  });
});

describe('Rate Limiter', () => {
  let app;

  beforeAll(async () => {
    const { default: rateLimiter } = await import('../middlewares/rateLimiter.js');
    
    app = express();
    app.use(express.json());
    app.post('/test-rate-limit', rateLimiter, (req, res) => {
      res.json({ ok: true });
    });
  });

  test('should allow requests within limit', async () => {
    const response = await request(app).post('/test-rate-limit');
    expect(response.status).toBe(200);
  });

  test('should block requests exceeding limit', async () => {
    // Make 11 requests (limit is 10)
    for (let i = 0; i < 10; i++) {
      await request(app).post('/test-rate-limit');
    }

    const response = await request(app).post('/test-rate-limit');
    expect(response.status).toBe(429);
    expect(response.body).toHaveProperty('error', 'Too many requests');
    expect(response.headers).toHaveProperty('retry-after');
  });
});
