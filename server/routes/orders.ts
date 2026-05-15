import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  sendOrderConfirmationEmail, 
  sendNewOrderAlertEmail, 
  sendOrderReadyEmail, 
  sendOrderCompletedEmail 
} from '../lib/mail.js';

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
    return res.status(503).json({ error: 'Database connection failed. Please try again.' });
  }

  const { items, totalAmount } = req.body;
  const userId = (req as any).user.id;
  const io = req.app.get('io');

  // Helper for retrying the inventory transaction
  const executeOrderWithRetry = async (maxRetries = 3) => {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          console.log(`[Order] Processing attempt ${attempt}/${maxRetries} for User ${userId}`);
          
          const inventoryPool = new Map<string, { name: string, amount: number }>();
          
          for (const item of items) {
            // Base Product Ingredients
            const productIngredients = await tx.productIngredient.findMany({
                where: { productId: item.productId },
                include: { inventoryItem: true }
            });

            if (!productIngredients) {
              console.warn(`[Inventory] No ingredients found for product ${item.productId}`);
            }

            for (const ingredient of productIngredients) {
              const needed = ingredient.quantityNeeded * item.quantity;
              const current = inventoryPool.get(ingredient.inventoryItemId) || { name: ingredient.inventoryItem.name, amount: 0 };
              inventoryPool.set(ingredient.inventoryItemId, { ...current, amount: current.amount + needed });
            }

            // Customization Ingredients
            if (item.customization && typeof item.customization === 'object') {
              for (const [categoryName, choiceValue] of Object.entries(item.customization as Record<string, any>)) {
                const values = Array.isArray(choiceValue) ? choiceValue : [choiceValue];
                
                for (const name of values) {
                  if (!name) continue;
                  
                  const choice = await tx.customizationChoice.findFirst({
                    where: { name: String(name), group: { name: categoryName } },
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

          // Verify stock logic
          for (const [itemId, req] of inventoryPool.entries()) {
            const stockItem = await tx.inventoryItem.findUnique({ 
              where: { id: itemId },
              select: { name: true, stockLevel: true } 
            });

            if (!stockItem) {
              console.error(`[Inventory] Item ID ${itemId} not found during stock verification.`);
              throw new Error(`Inventory Error: Item ${req.name} missing from database.`);
            }

            if (stockItem.stockLevel < req.amount) {
               console.warn(`[Inventory] Insufficient stock for ${stockItem.name}. Need: ${req.amount}, Have: ${stockItem.stockLevel}`);
               throw new Error(`Sold Out: ${stockItem.name} Insufficient`);
            }
          }

          // Deduct ingredients
          for (const [itemId, req] of inventoryPool.entries()) {
            await tx.inventoryItem.update({
              where: { id: itemId },
              data: { stockLevel: { decrement: req.amount } }
            });
          }

          const order = await tx.order.create({
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
              user: { select: { id: true, name: true, email: true } },
              items: { include: { product: true } }
            }
          });

          await tx.cartItem.deleteMany({ where: { userId } });
          return order;
        }, {
          maxWait: 5000,
          timeout: 10000 
        });
      } catch (error: any) {
        lastError = error;
        // If it's a transient DB error (e.g., P2028, P2034) or timeout, we retry
        const isTransient = error.code === 'P2034' || error.message?.includes('timeout') || error.message?.includes('deadlock');
        
        if (isTransient && attempt < maxRetries) {
          console.warn(`[Order] Transient error on attempt ${attempt}. Retrying... Reason: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, attempt * 500)); // Exponential backoff
          continue;
        }
        throw error;
      }
    }
  };

  try {
    const order = await executeOrderWithRetry();

    io.to('staff').emit('new-order', order);
    sendOrderConfirmationEmail(order).catch(e => console.error('[Mail] Confirmation error:', e));
    sendNewOrderAlertEmail(order).catch(e => console.error('[Mail] Admin alert error:', e));

    res.json(order);
  } catch (error: any) {
    console.error('[Order Failure] Detailed Log:', error);
    
    if (error.message?.includes('Sold Out')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message?.includes('Inventory Error')) {
      return res.status(409).json({ error: error.message });
    }

    res.status(500).json({ 
      error: 'Order Processing Failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Database is currently busy. Please try again in a few moments.' 
    });
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
  
      // Trigger status-based emails (non-blocking)
      if (status === 'READY') {
          sendOrderReadyEmail(updatedOrder).catch(e => console.error('[Mail] Ready email error:', e));
      } else if (status === 'COMPLETED') {
          sendOrderCompletedEmail(updatedOrder).catch(e => console.error('[Mail] Completed email error:', e));
      }

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
      const io = req.app.get('io');
      await prisma.order.delete({
        where: { id }
      });
      
      // Notify staff about deletion
      io.to('staff').emit('order-deleted', id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ error: 'Failed to delete order' });
    }
});
