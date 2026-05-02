import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { createAuditLog, AuditAction } from '../utils/audit.js';

export const getInventory = async (req: Request, res: Response) => {
  try {
    const items = await prisma.inventoryItem.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stockLevel, lowStockThreshold } = req.body;
  const adminId = (req as any).user?.id;

  try {
    const oldItem = await prisma.inventoryItem.findUnique({ where: { id } });
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { stockLevel, lowStockThreshold },
    });

    if (adminId && oldItem) {
      await createAuditLog({
        action: AuditAction.STOCK_UPDATE,
        adminId,
        targetId: id,
        targetName: item.name,
        details: {
          oldLevel: oldItem.stockLevel,
          newLevel: stockLevel,
          oldThreshold: oldItem.lowStockThreshold,
          newThreshold: lowStockThreshold,
        },
      });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createInventoryItem = async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id;
  try {
    const item = await prisma.inventoryItem.create({
      data: req.body,
    });

    if (adminId) {
      await createAuditLog({
        action: AuditAction.STOCK_CREATE,
        adminId,
        targetId: item.id,
        targetName: item.name,
        details: item,
      });
    }

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
