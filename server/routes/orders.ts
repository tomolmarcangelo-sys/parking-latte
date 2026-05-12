import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateUser } from '../middleware/auth.js';

export const ordersRouter = express.Router();
ordersRouter.use(authenticateUser);

ordersRouter.get('/', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const { id: userId, role } = (req as any).user;

  try {
    const orders = await prisma.order.findMany({
      where: role === 'ADMIN' || role === 'STAFF' ? {} : { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

ordersRouter.post('/', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const { items, totalAmount } = req.body;
  const userId = (req as any).user.id;
  const io = req.app.get('io');

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
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // 2. Deduct inventory
      for (const item of items) {
        // A. Base Product Ingredients
        const productIngredients = await tx.productIngredient.findMany({
            where: { productId: item.id },
        });

        for (const ingredient of productIngredients) {
          await tx.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: {
              stockLevel: {
                decrement: ingredient.quantityNeeded * item.quantity
              }
            }
          });
        }

        // B. Customization Ingredients
        if (item.customization && typeof item.customization === 'object') {
          // Iterate over all customization categories
          for (const [categoryName, choiceValue] of Object.entries(item.customization as Record<string, any>)) {
            const values = Array.isArray(choiceValue) ? choiceValue : [choiceValue];
            
            for (const name of values) {
              if (!name) continue;
              
              // Find the choice associated with this name in this category
              const choice = await tx.customizationChoice.findFirst({
                where: {
                  name: String(name),
                  group: { name: categoryName }
                },
                include: { ingredients: true }
              });

              if (choice && choice.ingredients.length > 0) {
                for (const ingredient of choice.ingredients) {
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
            }
          }
        }
      }
      return newOrder;
    });

    // Notify staff
    io.to('staff').emit('new-order', order);

    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

ordersRouter.patch('/:id/status', async (req, res) => {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not configured' });
    }
  
    const { id } = req.params;
    const { status } = req.body;
    const io = req.app.get('io');
  
    try {
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            items: {
                include: {
                    product: true
                }
            }
        }
      });
  
      // Notify user and staff
      io.to(updatedOrder.userId).emit('order-updated', updatedOrder);
      io.to('staff').emit('order-updated', updatedOrder);
  
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
});
