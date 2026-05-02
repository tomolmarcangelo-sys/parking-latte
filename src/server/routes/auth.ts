import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, verificationLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, authController.register);
authRouter.post('/login', authLimiter, authController.login);
authRouter.post('/resend-verification', verificationLimiter, authController.resendVerification);
authRouter.post('/google', authController.googleLogin);
authRouter.get('/verify-email', verificationLimiter, authController.verifyEmail);
authRouter.put('/profile', authenticate, authController.updateProfile);
