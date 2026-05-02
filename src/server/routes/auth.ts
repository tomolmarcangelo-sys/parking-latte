import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/resend-verification', authController.resendVerification);
authRouter.post('/google', authController.googleLogin);
authRouter.get('/verify-email', authController.verifyEmail);
authRouter.put('/profile', authenticate, authController.updateProfile);
