import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../db.js';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { authenticateUser } from '../middleware/auth.js';
import { sendVerificationEmail } from '../lib/mail.js';

export const authRouter = express.Router();

let googleClientInstance: OAuth2Client | null = null;
const getGoogleClient = () => {
    if (!googleClientInstance) {
        googleClientInstance = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }
    return googleClientInstance;
};

authRouter.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });

  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'DB not configured' });

  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid token' });

    // Validate audience manually if verifyIdToken didn't throw (though it should)
    const backendAudience = process.env.GOOGLE_CLIENT_ID;
    console.log('Backend Audience:', backendAudience, 'Token Audience:', payload.aud);
    if (payload.aud !== backendAudience) {
        console.error('Audience mismatch:', { expected: backendAudience, actual: payload.aud });
        return res.status(400).json({ error: 'Google sign-in failed: Audience mismatch' });
    }

    let user = await prisma.user.findUnique({ where: { email: payload.email } });
    
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: payload.email,
                name: payload.name || 'Google User',
                role: 'CUSTOMER',
                emailVerified: true
            }
        });
    } else if (!user.emailVerified) {
        user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true }
        });
    }

    const jwtToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ error: 'Google sign-in failed: ' + (error instanceof Error ? error.message : 'Unknown error') });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'DB not configured' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const currentHash = user.password;
    let isValidPassword = false;
    let needsUpgrade = false;

    if (currentHash.startsWith('$2')) {
      isValidPassword = await bcrypt.compare(password, currentHash);
    } else {
      // Graceful migration from plain text
      isValidPassword = password === currentHash;
      needsUpgrade = isValidPassword;
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Auto-upgrade plain text to hash if matched
    if (needsUpgrade) {
      const newHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash }
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in.',
        notVerified: true 
      });
    }

    const jwtToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ 
      token: jwtToken, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'DB not configured' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationTokenHash: hashedToken,
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }
    });

    await sendVerificationEmail(email, token);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'DB not configured' });

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        verificationTokenHash: hashedToken,
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }
    });

    await sendVerificationEmail(email, token);

    res.status(201).json({ message: 'User registered, check email', requiresVerification: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


authRouter.put('/profile', authenticateUser, async (req: any, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'DB not configured' });
  const { name } = req.body;
  const userId = req.user.id;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

authRouter.get('/verify-email', async (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) return res.status(400).json({ error: 'Missing token/email' });

  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'DB not configured' });

  try {
    const user = await prisma.user.findUnique({ where: { email: email as string } });
    if (!user || !user.verificationTokenHash || !user.verificationTokenExpires) {
        return res.status(400).json({ error: 'Invalid verification link' });
    }
    
    if (user.verificationTokenExpires < new Date()) {
        return res.status(400).json({ error: 'Token expired' });
    }

    const isValidToken = await bcrypt.compare(token as string, user.verificationTokenHash);
    if (!isValidToken) return res.status(400).json({ error: 'Invalid verification token' });

    await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, verificationTokenHash: null, verificationTokenExpires: null }
    });

    const jwtToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
