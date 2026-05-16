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

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        isVerified: true
      },
      create: {
        email: payload.email,
        name: payload.name || 'Google User',
        role: 'CUSTOMER',
        isVerified: true
      }
    });

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

    if (!user.isVerified) {
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

const resendRateLimit = new Map<string, number>();

authRouter.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const lastAttempt = resendRateLimit.get(email);
  if (lastAttempt && Date.now() - lastAttempt < 60000) {
    return res.status(429).json({ error: 'Please wait 60 seconds before sending another email.' });
  }

  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'DB not configured' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'Email already verified' });

    resendRateLimit.set(email, Date.now());

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: hashedCode,
        verificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      }
    });

    await sendVerificationEmail(email, code);

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

    const passwordHashed = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHashed,
        name,
        verificationCode: hashedCode,
        verificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      }
    });

    await sendVerificationEmail(email, code);

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

authRouter.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing email/code' });
  }

  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'DB not configured' });

  try {
    const emailLower = email.toLowerCase();
    const sanitizedCode = code.replace(/\D/g, '');
    
    // Perform lookup and update within a transaction to avoid race conditions
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email: emailLower } });
      
      if (!user || !user.verificationCode || !user.verificationExpires) {
        throw new Error('invalid');
      }
      
      // Use UTC comparison logic
      if (new Date(user.verificationExpires).getTime() < Date.now()) {
        throw new Error('expired');
      }

      const isValidCode = await bcrypt.compare(sanitizedCode, user.verificationCode);
      if (!isValidCode) throw new Error('invalid');

      return await tx.user.update({
          where: { id: user.id },
          data: { isVerified: true, verificationCode: null, verificationExpires: null }
      });
    });

    res.json({ message: 'Email verified successfully!' });
  } catch (error: any) {
    console.error(error);
    const reason = error.message === 'expired' ? 'expired' : 'invalid';
    res.status(400).json({ error: reason === 'expired' ? 'Code expired' : 'Invalid code' });
  }
});
