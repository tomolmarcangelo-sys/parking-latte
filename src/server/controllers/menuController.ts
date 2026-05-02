import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { createAuditLog, AuditAction } from '../utils/audit.js';

export const getMenu = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: {
          include: {
            customizations: {
              include: {
                group: {
                  include: {
                    choices: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const flattenedCategories = categories.map((cat) => ({
      ...cat,
      products: cat.products.map((prod) => ({
        ...prod,
        // Calculate frontend price (Decimal to number)
        price: Number(prod.price),
        customizationGroups: prod.customizations.map((c) => ({
          ...c.group,
          choices: c.group.choices.map(choice => ({
            ...choice,
            priceModifier: Number(choice.priceModifier)
          }))
        }))
      })),
    }));

    res.json(flattenedCategories);
  } catch (error) {
    console.error('getMenu error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCategories = async (req: Request, res: Response) => {
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
    res.status(500).json({ message: 'Server error' });
  }
};

// I will only replace the parts that I need to edit to stay concise
export const createCategory = async (req: Request, res: Response) => {
  const { name } = req.body;
  const adminId = (req as any).user?.id;
  try {
    const category = await prisma.category.create({
      data: { name },
    });
    
    if (adminId) {
      await createAuditLog({
        action: AuditAction.CATEGORY_CREATE,
        adminId,
        targetId: category.id,
        targetName: category.name,
        details: { name },
      });
    }

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const adminId = (req as any).user?.id;
  try {
    const oldCategory = await prisma.category.findUnique({ where: { id } });
    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });

    if (adminId && oldCategory) {
      await createAuditLog({
        action: AuditAction.CATEGORY_UPDATE,
        adminId,
        targetId: id,
        targetName: category.name,
        details: { oldName: oldCategory.name, newName: name },
      });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = (req as any).user?.id;
  try {
    const category = await prisma.category.findUnique({ where: { id } });
    
    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: id }
    });

    if (productCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with associated products' 
      });
    }

    await prisma.category.delete({ where: { id } });

    if (adminId && category) {
      await createAuditLog({
        action: AuditAction.CATEGORY_DELETE,
        adminId,
        targetId: id,
        targetName: category.name,
        details: { name: category.name },
      });
    }

    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const { name, description, price, imageUrl, categoryId, ingredients } = req.body;
  const adminId = (req as any).user?.id;
  try {
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        categoryId,
        ingredients: {
          create: ingredients?.map((ing: any) => ({
            inventoryItemId: ing.inventoryItemId,
            quantityNeeded: ing.quantityNeeded,
          })),
        },
      },
    });

    if (adminId) {
      await createAuditLog({
        action: AuditAction.PRODUCT_CREATE,
        adminId,
        targetId: product.id,
        targetName: product.name,
        details: { name, description, price, categoryId },
      });
    }

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, imageUrl, categoryId } = req.body;
  const adminId = (req as any).user?.id;
  try {
    const oldProduct = await prisma.product.findUnique({ where: { id } });
    const product = await prisma.product.update({
      where: { id },
      data: { name, description, price, imageUrl, categoryId },
    });

    if (adminId && oldProduct) {
      const details: any = {};
      if (oldProduct.price.toString() !== price.toString()) {
        details.oldPrice = oldProduct.price;
        details.newPrice = price;
        
        await createAuditLog({
          action: AuditAction.PRICE_UPDATE,
          adminId,
          targetId: id,
          targetName: product.name,
          details,
        });
      }

      await createAuditLog({
        action: AuditAction.PRODUCT_UPDATE,
        adminId,
        targetId: id,
        targetName: product.name,
        details: { name, categoryId },
      });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = (req as any).user?.id;
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    await prisma.product.delete({ where: { id } });

    if (adminId && product) {
      await createAuditLog({
        action: AuditAction.PRODUCT_DELETE,
        adminId,
        targetId: id,
        targetName: product.name,
        details: { name: product.name },
      });
    }

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
