import { Request, Response } from 'express';
import { prisma } from '../db.js';

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

  try {
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { stockLevel, lowStockThreshold },
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createInventoryItem = async (req: Request, res: Response) => {
  try {
    const item = await prisma.inventoryItem.create({
      data: req.body,
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
