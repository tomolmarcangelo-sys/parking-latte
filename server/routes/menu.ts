import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

export const menuRouter = express.Router();

menuRouter.get('/', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  const isAdmin = req.query.admin === 'true';
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: {
          where: isAdmin ? undefined : { isVisible: true },
          include: {
            ingredients: true,
            customizations: {
              include: {
                group: {
                  include: {
                    choices: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const formattedCategories = categories.map(cat => ({
      ...cat,
      products: cat.products.map(prod => ({
        ...prod,
        customizationGroups: prod.customizations.map(c => c.group),
        customizations: prod.customizations
      }))
    }));

    res.json(formattedCategories);
  } catch (error: any) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

menuRouter.get('/categories', async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Category Management
menuRouter.post('/categories', authenticateAdmin, async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  
  const { name } = req.body;
  try {
    const category = await prisma.category.create({
      data: { name }
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

menuRouter.put('/categories/:id', authenticateAdmin, async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  
  const { id } = req.params;
  const { name } = req.body;
  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name }
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

menuRouter.delete('/categories/:id', authenticateAdmin, async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  
  const { id } = req.params;
  try {
    await prisma.category.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Product Management
menuRouter.post('/', authenticateAdmin, async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  
  const { name, description, price, imageUrl, categoryId, ingredients, customizationGroupIds, isVisible } = req.body;
  try {
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        categoryId,
        isVisible: isVisible !== undefined ? isVisible : true,
        ingredients: {
          create: (ingredients || []).map((ing: any) => ({
            inventoryItemId: ing.inventoryItemId,
            quantityNeeded: ing.quantityNeeded
          }))
        },
        customizations: {
          create: (customizationGroupIds || []).map((groupId: string) => ({
            groupId
          }))
        }
      }
    });
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

menuRouter.put('/:id', authenticateAdmin, async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  
  const { id } = req.params;
  const { name, description, price, imageUrl, categoryId, customizationGroupIds, ingredients, isVisible } = req.body;
  try {
    const product = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          name,
          description,
          price,
          imageUrl,
          categoryId,
          ...(isVisible !== undefined && { isVisible })
        }
      });

      if (customizationGroupIds) {
        await tx.productCustomization.deleteMany({ where: { productId: id } });
        await tx.productCustomization.createMany({
          data: customizationGroupIds.map((groupId: string) => ({
            productId: id,
            groupId
          }))
        });
      }

      if (ingredients) {
        await tx.productIngredient.deleteMany({ where: { productId: id } });
        await tx.productIngredient.createMany({
          data: ingredients.map((ing: any) => ({
            productId: id,
            inventoryItemId: ing.inventoryItemId,
            quantityNeeded: ing.quantityNeeded
          }))
        });
      }

      return updatedProduct;
    });
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

menuRouter.delete('/:id', authenticateAdmin, async (req, res) => {
  const prisma = await getPrismaClient();
  if (!prisma) return res.status(503).json({ error: 'Database not configured' });
  
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});
