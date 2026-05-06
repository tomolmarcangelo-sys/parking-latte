import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateUser } from '../middleware/auth.js';

export const ordersRouter = express.Router();
ordersRouter.use(authenticateUser);

ordersRouter.post('/', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const { items, totalAmount } = req.body;
  const userId = (req as any).user.id;

  try {
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          items: {
            create: items.map((item: any) => ({
                productId: item.id,
                quantity: item.quantity,
                customization: item.customization || {},
                priceAtOrder: item.price
            }))
          }
        }
      });

      // 2. Deduct inventory
      for (const item of items) {
        const ingredients = await tx.productIngredient.findMany({
            where: { productId: item.id },
        });

        for (const ingredient of ingredients) {
          await tx.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: {
              stockLevel: {
                decrement: ingredient.quantityNeeded * item.quantity
              }
            }
          });
        }
      }
      return newOrder;
    });

    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});
