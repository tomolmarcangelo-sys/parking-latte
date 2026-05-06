import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../db.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';

export const authRouter = express.Router();

let googleClientInstance: OAuth2Client | null = null;
const getGoogleClient = () => {
    if (!googleClientInstance) {
        googleClientInstance = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }
    return googleClientInstance;
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
    }

    const jwtToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ error: 'Google sign-in failed: ' + (error instanceof Error ? error.message : 'Unknown error') });
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

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify your account',
      text: `Click this link to verify: ${process.env.FRONTEND_URL}/verify?token=${token}&email=${email}`,
    });

    res.status(201).json({ message: 'User registered, check email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
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
