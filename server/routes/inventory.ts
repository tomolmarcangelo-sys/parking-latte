import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

export const inventoryRouter = express.Router();

inventoryRouter.get('/', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  try {
    const inventory = await prisma.inventoryItem.findMany();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

inventoryRouter.post('/', authenticateAdmin, async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { name, unit, stockLevel, lowStockThreshold } = req.body;
  try {
    const item = await prisma.inventoryItem.upsert({
      where: { name },
      update: {
        unit,
        stockLevel: { increment: stockLevel },
        lowStockThreshold
      },
      create: { name, unit, stockLevel, lowStockThreshold }
    });
    res.json(item);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create item', details: error.message || String(error) });
  }
});

inventoryRouter.post('/:id/restock', authenticateAdmin, async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { id } = req.params;
  const { amount } = req.body;
  try {
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { stockLevel: { increment: amount } }
    });
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'STOCK_UPDATE',
        adminId: (req as any).user.id,
        adminName: (req as any).user.name || (req as any).user.email,
        targetId: id,
        targetName: item.name,
        details: { oldLevel: item.stockLevel - amount, newLevel: item.stockLevel }
      }
    });

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restock' });
  }
});
