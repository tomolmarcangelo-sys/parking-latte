import { Request, Response } from 'express';
import { prisma } from '../db.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, totalRevenue, topProducts] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'COMPLETED' },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Fetch product names for top products
    const topProductsWithNames = await Promise.all(
      topProducts.map(async (p) => {
        const product = await prisma.product.findUnique({ where: { id: p.productId } });
        return { name: product?.name, quantity: p._sum.quantity };
      })
    );

    res.json({
      totalOrders,
      todayOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      topProducts: topProductsWithNames,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  const { userId, role } = req.body;
  const adminId = (req as any).user.id;

  try {
    const [oldUser, adminUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: adminId } }),
    ]);

    if (!oldUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ROLE_CHANGE',
        adminId: adminId,
        adminName: adminUser?.name || adminUser?.email,
        targetId: userId,
        targetName: user.name || user.email,
        details: {
          oldRole: oldUser.role,
          newRole: role,
        },
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to last 100 logs
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCustomizationGroup = async (req: Request, res: Response) => {
  const { name, required, productIds } = req.body;
  try {
    const group = await prisma.customizationGroup.create({
      data: {
        name,
        required,
        products: {
          create: productIds?.map((id: string) => ({ productId: id })) || [],
        },
      },
      include: { choices: true, products: true },
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCustomizationGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, required, productIds } = req.body;
  try {
    // Reset products and update
    await prisma.productCustomization.deleteMany({ where: { groupId: id } });
    const group = await prisma.customizationGroup.update({
      where: { id },
      data: {
        name,
        required,
        products: {
          create: productIds?.map((id: string) => ({ productId: id })) || [],
        },
      },
      include: { choices: true, products: true },
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCustomizationGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.customizationGroup.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCustomizationChoice = async (req: Request, res: Response) => {
  const { groupId, name, priceModifier } = req.body;
  try {
    const choice = await prisma.customizationChoice.create({
      data: { groupId, name, priceModifier },
    });
    res.status(201).json(choice);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCustomizationChoice = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.customizationChoice.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllCustomizations = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.customizationGroup.findMany({
      include: { 
        choices: true,
        products: {
          include: { product: true }
        }
      },
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
