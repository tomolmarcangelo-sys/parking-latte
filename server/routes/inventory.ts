import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

export const inventoryRouter = express.Router();

inventoryRouter.get('/', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=30');
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  try {
    const [inventory, carts] = await Promise.all([
      prisma.inventoryItem.findMany({
        include: {
          products: { include: { product: true } },
          customizations: { include: { choice: { include: { group: true } } } }
        }
      }),
      prisma.cartItem.findMany({
        include: {
          product: {
            include: {
              ingredients: true
            }
          }
        }
      })
    ]);

    // Calculate projected deduction from carts
    const projectedDeductions = new Map<string, number>();

    for (const cart of carts) {
      // 1. Base Product Ingredients
      for (const ingredient of cart.product.ingredients) {
        const needed = ingredient.quantityNeeded * cart.quantity;
        projectedDeductions.set(ingredient.inventoryItemId, (projectedDeductions.get(ingredient.inventoryItemId) || 0) + needed);
      }

      // 2. Customization Ingredients
      if (cart.customization && typeof cart.customization === 'object') {
        const customization = cart.customization as Record<string, any>;
        for (const [groupName, choiceValue] of Object.entries(customization)) {
          const names = Array.isArray(choiceValue) ? choiceValue : [choiceValue];
          for (const name of names) {
            if (!name) continue;
            // Fetch ingredients for this choice
            const choice = await prisma.customizationChoice.findFirst({
              where: { name: String(name), group: { name: groupName } },
              include: { ingredients: true }
            });
            if (choice) {
              for (const ingredient of choice.ingredients) {
                const needed = ingredient.quantityNeeded * cart.quantity;
                projectedDeductions.set(ingredient.inventoryItemId, (projectedDeductions.get(ingredient.inventoryItemId) || 0) + needed);
              }
            }
          }
        }
      }
    }

    const inventoryWithProjected = inventory.map(item => ({
      ...item,
      projectedStock: Math.max(0, item.stockLevel - (projectedDeductions.get(item.id) || 0))
    }));

    res.json(inventoryWithProjected);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

inventoryRouter.post('/', authenticateAdmin, async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { id, name, unit, stockLevel, lowStockThreshold, productLinks, customizationLinks } = req.body;
  try {
    const item = await prisma.$transaction(async (tx) => {
      const existing = id ? await tx.inventoryItem.findUnique({ where: { id } }) : null;
      
      const inventoryData = {
        name,
        unit,
        stockLevel: id ? Number(stockLevel) : Number(stockLevel), // If updating, we might want to additive vs set. Here we set.
        lowStockThreshold: Number(lowStockThreshold)
      };

      const upsertedItem = id 
        ? await tx.inventoryItem.update({ where: { id }, data: inventoryData })
        : await tx.inventoryItem.create({ data: inventoryData });

      // Handle Product Links
      if (productLinks) {
        await tx.productIngredient.deleteMany({ where: { inventoryItemId: upsertedItem.id } });
        await tx.productIngredient.createMany({
          data: productLinks.map((link: any) => ({
            inventoryItemId: upsertedItem.id,
            productId: link.productId,
            quantityNeeded: Number(link.quantityNeeded)
          }))
        });
      }

      // Handle Customization Links
      if (customizationLinks) {
        await tx.customizationIngredient.deleteMany({ where: { inventoryItemId: upsertedItem.id } });
        await tx.customizationIngredient.createMany({
          data: customizationLinks.map((link: any) => ({
            inventoryItemId: upsertedItem.id,
            choiceId: link.choiceId,
            quantityNeeded: Number(link.quantityNeeded)
          }))
        });
      }

      return upsertedItem;
    });

    res.json(item);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process inventory item', details: error.message || String(error) });
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
