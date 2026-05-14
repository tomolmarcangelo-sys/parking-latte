import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateUser } from '../middleware/auth.js';

export const ordersRouter = express.Router();
ordersRouter.use(authenticateUser);

ordersRouter.get('/me', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const userId = (req as any).user.id;

  try {
    const orders = await prisma.order.findMany({
      where: { userId },
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
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch your orders' });
  }
});

ordersRouter.get('/', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const { role } = (req as any).user;
  if(role !== 'ADMIN' && role !== 'STAFF') {
      return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const orders = await prisma.order.findMany({
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
    console.error('Error fetching global orders:', error);
    res.status(500).json({ error: 'Failed to fetch global orders' });
  }
});

ordersRouter.get('/:id', async (req, res) => {
    const prisma = await getPrismaClient();
    if (!prisma) {
        return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { id: userId, role } = (req as any).user;

    try {
        const order = await prisma.order.findUnique({
            where: { id },
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

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.userId !== userId && role !== 'ADMIN' && role !== 'STAFF') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
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
      // 1. Calculate requested ingredients total for ALL items in order
      const inventoryPool = new Map<string, { name: string, amount: number }>();
      
      for (const item of items) {
        // A. Base Product Ingredients
        const productIngredients = await tx.productIngredient.findMany({
            where: { productId: item.productId },
            include: { inventoryItem: true }
        });

        for (const ingredient of productIngredients) {
          const needed = ingredient.quantityNeeded * item.quantity;
          const current = inventoryPool.get(ingredient.inventoryItemId) || { name: ingredient.inventoryItem.name, amount: 0 };
          inventoryPool.set(ingredient.inventoryItemId, { ...current, amount: current.amount + needed });
        }

        // B. Customization Ingredients
        if (item.customization && typeof item.customization === 'object') {
          for (const [categoryName, choiceValue] of Object.entries(item.customization as Record<string, any>)) {
            const values = Array.isArray(choiceValue) ? choiceValue : [choiceValue];
            
            for (const name of values) {
              if (!name) continue;
              
              const choice = await tx.customizationChoice.findFirst({
                where: {
                  name: String(name),
                  group: { name: categoryName }
                },
                include: { ingredients: { include: { inventoryItem: true } } }
              });

              if (choice && choice.ingredients.length > 0) {
                for (const ingredient of choice.ingredients) {
                  const needed = ingredient.quantityNeeded * item.quantity;
                  const current = inventoryPool.get(ingredient.inventoryItemId) || { name: ingredient.inventoryItem.name, amount: 0 };
                  inventoryPool.set(ingredient.inventoryItemId, { ...current, amount: current.amount + needed });
                }
              }
            }
          }
        }
      }

      // 2. Scan and Verify stock for all summed requirements
      for (const [itemId, req] of inventoryPool.entries()) {
        const stockItem = await tx.inventoryItem.findUnique({ where: { id: itemId } });
        if (!stockItem || stockItem.stockLevel < req.amount) {
           throw new Error(`Sold Out: Missing Ingredients - ${req.name}`);
        }
      }

      // 3. Perform Deductions
      for (const [itemId, req] of inventoryPool.entries()) {
        await tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            stockLevel: {
              decrement: req.amount
            }
          }
        });
      }

      // 4. Create actual order records
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          items: {
            create: items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                customization: item.customization || {},
                priceAtOrder: item.priceAtOrder
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

      // 5. Clear the user's cart
      await tx.cartItem.deleteMany({
        where: { userId }
      });

      return newOrder;
    });

    // Notify staff
    io.to('staff').emit('new-order', order);

    res.json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    if (error.message && error.message.includes('Out of stock')) {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create order' });
  }
});

ordersRouter.patch('/:id/status', async (req, res) => {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not configured' });
    }
  
    const { id } = req.params;
    const { status, staffNotes } = req.body;
    const { id: staffId, name: staffName, role } = (req as any).user;
    const io = req.app.get('io');
  
    if (role !== 'ADMIN' && role !== 'STAFF') {
        return res.status(403).json({ error: 'Forbidden' });
    }
  
    try {
      const updateData: any = { 
          status,
          staffNotes,
          lastUpdatedBy: staffName
      };

      if (status === 'READY') {
          updateData.readyAt = new Date();
      } else if (status === 'COMPLETED') {
          updateData.completedAt = new Date();
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: updateData,
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
      io.to(`user_${updatedOrder.userId}`).emit('order-updated', updatedOrder);
      io.to('staff').emit('order-updated', updatedOrder);
  
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
});

ordersRouter.delete('/:id', async (req, res) => {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not configured' });
    }
  
    const { id } = req.params;
    const { role } = (req as any).user;
  
    if (role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }
  
    try {
      await prisma.order.delete({
        where: { id }
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ error: 'Failed to delete order' });
    }
});
