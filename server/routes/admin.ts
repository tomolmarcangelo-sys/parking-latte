import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

export const adminRouter = express.Router();

adminRouter.use(authenticateAdmin);

adminRouter.get('/stats', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=10');
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  try {
    const totalOrders = await prisma.order.count();
    const revenueResult = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'COMPLETED' }
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await prisma.order.count({
      where: { createdAt: { gte: today } }
    });

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const productsWithNames = await Promise.all(topProducts.map(async (tp) => {
      const product = await prisma.product.findUnique({ where: { id: tp.productId } });
      return {
        name: product?.name || 'Unknown',
        quantity: tp._sum.quantity || 0
      };
    }));

    res.json({
      totalOrders,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      todayOrders,
      topProducts: productsWithNames
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

adminRouter.get('/customizations', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  try {
    const groups = await prisma.customizationGroup.findMany({
      include: {
        choices: true,
        products: {
          include: { product: true }
        }
      }
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customizations' });
  }
});

adminRouter.post('/customizations/group', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { name, required, productIds, choices } = req.body;
  try {
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.customizationGroup.create({
        data: {
          name,
          required,
          products: {
            create: (productIds || []).map((pid: string) => ({ productId: pid }))
          }
        }
      });

      if (choices && choices.length > 0) {
        await tx.customizationChoice.createMany({
          data: choices.map((c: any) => ({
            groupId: newGroup.id,
            name: c.name,
            priceModifier: c.priceModifier
          }))
        });
      }

      return newGroup;
    });
    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

adminRouter.post('/customizations/choice', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { groupId, name, priceModifier } = req.body;
  try {
    const choice = await prisma.customizationChoice.create({
      data: { groupId, name, priceModifier }
    });
    res.json(choice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create choice' });
  }
});

adminRouter.put('/customizations/group/:id', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { id } = req.params;
  const { name, required, productIds, choices } = req.body;
  try {
    const group = await prisma.$transaction(async (tx) => {
      // Update group basic info
      const updatedGroup = await tx.customizationGroup.update({
        where: { id },
        data: { name, required }
      });

      // Update product links
      if (productIds) {
        await tx.productCustomization.deleteMany({ where: { groupId: id } });
        await tx.productCustomization.createMany({
          data: productIds.map((pid: string) => ({ productId: pid, groupId: id }))
        });
      }

      // Update choices
      if (choices) {
        const existingChoices = await tx.customizationChoice.findMany({ where: { groupId: id } });
        const existingIds = existingChoices.map(c => c.id);
        const incomingIds = choices.filter((c: any) => c.id).map((c: any) => c.id);

        // Delete choices not in incoming
        const toDelete = existingIds.filter(eid => !incomingIds.includes(eid));
        if (toDelete.length > 0) {
          await tx.customizationChoice.deleteMany({ where: { id: { in: toDelete } } });
        }

        // Update existing choices and create new ones
        for (const choice of choices) {
          if (choice.id) {
            await tx.customizationChoice.update({
              where: { id: choice.id },
              data: { name: choice.name, priceModifier: choice.priceModifier }
            });
          } else {
            await tx.customizationChoice.create({
              data: { 
                groupId: id, 
                name: choice.name, 
                priceModifier: choice.priceModifier 
              }
            });
          }
        }
      }

      return updatedGroup;
    });
    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

adminRouter.delete('/customizations/group/:id', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { id } = req.params;
  try {
    await prisma.customizationGroup.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

adminRouter.post('/customizations/choice', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { groupId, name, priceModifier } = req.body;
  try {
    const choice = await prisma.customizationChoice.create({
      data: {
        groupId,
        name,
        priceModifier
      }
    });
    res.json(choice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create choice' });
  }
});

adminRouter.put('/customizations/choice/:id', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { id } = req.params;
  const { name, priceModifier } = req.body;
  try {
    const choice = await prisma.customizationChoice.update({
      where: { id },
      data: { name, priceModifier }
    });
    res.json(choice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update choice' });
  }
});

adminRouter.delete('/customizations/choice/:id', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const { id } = req.params;
  try {
    await prisma.customizationChoice.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete choice' });
  }
});

adminRouter.get('/audit-logs', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const action = req.query.action as string;
  const adminId = req.query.adminId as string;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (action) {
    where.action = action;
  }
  if (adminId) {
    where.adminId = adminId;
  }

  try {
    const [logs, total, actionsAvailable] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ['action']
      })
    ]);

    const distinctActions = actionsAvailable.map(a => a.action);

    res.json({
      logs,
      distinctActions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});
