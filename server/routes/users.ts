import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateAdmin, authenticateUser } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

export const usersRouter = express.Router();

// Allow any logged in user to change their password
usersRouter.put('/change-password', authenticateUser, async (req: any, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new passwords are required' });
  }

  // Password validation: min 8 chars, at least 1 number
  if (newPassword.length < 8 || !/\d/.test(newPassword)) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long and contain at least one number' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'This account does not have a password set (likely a Google-only account). Please contact support.' });
    }

    const currentHash = user.password;
    let isMatch = false;

    // Check if it's a bcrypt hash (usually starts with $2)
    if (currentHash.startsWith('$2')) {
      isMatch = await bcrypt.compare(currentPassword, currentHash);
    } else {
      // Fallback for plain text passwords from earlier migrations
      isMatch = currentPassword === currentHash;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin-only routes below
usersRouter.use(authenticateAdmin);

usersRouter.get('/', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const users = await prisma.user.findMany({
      select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isVerified: true,
          createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

usersRouter.post('/', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { email, password, name, role } = req.body;
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'CUSTOMER' }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

usersRouter.put('/:id', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { id } = req.params;
    const { name, email, role, isVerified } = req.body;

    // Optional: Prevent changing own role if it's currently ADMIN? 
    // For now, let's just implement the basic update.

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, role, isVerified }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

usersRouter.delete('/:id', async (req: any, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    if (id === adminId) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last administrator' });
      }
    }

    await prisma.user.delete({
      where: { id }
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
