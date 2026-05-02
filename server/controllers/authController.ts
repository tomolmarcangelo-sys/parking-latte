import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { sendVerificationEmail } from '../utils/email.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { name } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (password.length < 8 || !/\d/.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters and contain at least one number' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const verificationToken = hashToken(rawToken);
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const hashedPassword = await bcrypt.hash(password, 10);

    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'CUSTOMER';

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        emailVerified: false,
        verificationTokenHash: verificationToken,
        verificationTokenExpires,
      },
    });

    await sendVerificationEmail(email, rawToken);

    res.status(201).json({ 
      message: 'Registration successful. If the email is valid, you will receive a verification link.',
      requiresVerification: true 
    });
  } catch (error: any) {
    console.error('Registration error details:', error);
    res.status(500).json({ message: 'Registration failed. Please try again later.' });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Generic response to prevent email enumeration
    const genericResponse = { message: 'If an account exists with that email, a new verification link has been sent.' };

    if (!user || user.emailVerified) {
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const verificationToken = hashToken(rawToken);
    const verificationTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour for resends

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationTokenHash: verificationToken,
        verificationTokenExpires,
      },
    });

    await sendVerificationEmail(email, rawToken);

    res.json(genericResponse);
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token) return res.status(400).json({ message: 'Missing verification token' });

  try {
    const hashedToken = hashToken(token as string);
    const user = await prisma.user.findUnique({
      where: { verificationTokenHash: hashedToken },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      return res.status(400).json({ message: 'Verification link has expired. Please request a new one.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationTokenHash: null,
        verificationTokenExpires: null,
      },
    });

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    // Check if user has a password (might be a google-only user)
    if (!user.password) {
      return res.status(400).json({ message: 'Please sign in with Google' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Enforce email verification
    if (!user.emailVerified) {
      return res.status(403).json({ 
        message: 'Please verify your email before logging in.',
        notVerified: true
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  const { credential } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    const { email, name, sub: googleId } = payload;

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Update googleId if not already set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, emailVerified: true },
        });
      }
    } else {
      // Create new user
      const userCount = await prisma.user.count();
      const role = userCount === 0 ? 'ADMIN' : 'CUSTOMER';

      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          emailVerified: true,
          role,
        },
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};
