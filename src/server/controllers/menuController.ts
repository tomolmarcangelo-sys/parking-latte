import { Request, Response } from 'express';
import { prisma } from '../db.js';

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

export const createCategory = async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const category = await prisma.category.create({
      data: { name },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
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
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const { name, description, price, imageUrl, categoryId, ingredients } = req.body;
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
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, imageUrl, categoryId } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id },
      data: { name, description, price, imageUrl, categoryId },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
