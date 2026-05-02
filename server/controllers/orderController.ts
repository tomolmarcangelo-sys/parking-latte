import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const createOrder = async (req: AuthRequest, res: Response) => {
  const { items, totalAmount } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              customization: item.customization,
              priceAtOrder: item.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  ingredients: true,
                },
              },
            },
          },
        },
      });

      // 2. Deduct inventory
      for (const item of order.items) {
        for (const ingredient of item.product.ingredients) {
          const reduction = ingredient.quantityNeeded * item.quantity;
          await tx.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: {
              stockLevel: {
                decrement: reduction,
              },
            },
          });
        }
      }

      return order;
    });

    // Notify staff via Socket.io
    const io = req.app.get('io');
    io.to('staff').emit('new-order', result);

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error placing order. Possibly low stock.' });
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  try {
    let where = {};
    if (role === 'CUSTOMER') {
      where = { userId };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // Notify customer and staff
    const io = req.app.get('io');
    io.to(order.userId).emit('order-updated', order);
    io.to('staff').emit('order-updated', order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
