import express from 'express';
import { getPrismaClient } from '../db.js';
import { authenticateUser } from '../middleware/auth.js';

export const cartRouter = express.Router();

cartRouter.use(authenticateUser);

cartRouter.get('/', async (req, res) => {
    const prisma = await getPrismaClient();
    if (!prisma) return res.status(503).json({ error: 'Database not configured' });
    
    // @ts-ignore
    const userId = req.user.id;
    try {
        const cart = await prisma.cartItem.findMany({
            where: { userId },
            include: { 
                product: {
                    include: {
                        customizations: {
                            include: {
                                group: {
                                    include: { choices: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const formattedCart = cart.map(item => ({
            ...item,
            product: {
                ...item.product,
                customizationGroups: item.product.customizations.map(c => c.group)
            }
        }));

        res.json(formattedCart);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

cartRouter.post('/', async (req, res) => {
    const prisma = await getPrismaClient();
    if (!prisma) return res.status(503).json({ error: 'Database not configured' });
    
    // @ts-ignore
    const userId = req.user.id;
    const { productId, quantity, customization } = req.body;
    try {
        const sortObject = (obj: any): any => {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            if (Array.isArray(obj)) {
                return [...obj].sort().map(sortObject);
            }
            return Object.keys(obj).sort().reduce((result: any, key) => {
                result[key] = sortObject(obj[key]);
                return result;
            }, {});
        };

        const existingItems = await prisma.cartItem.findMany({
            where: { userId, productId }
        });

        const normalizedCustomization = customization ? sortObject(customization) : null;

        // Simple deep equal for JSON objects
        let match;
        for (const item of existingItems) {
            const itemCustomization = item.customization ? sortObject(item.customization) : null;
            if (JSON.stringify(itemCustomization) === JSON.stringify(normalizedCustomization)) {
                match = item;
                break;
            }
        }

        let cartItem;
        const includeQuery = { 
            product: {
                include: {
                    customizations: {
                        include: {
                            group: {
                                include: { choices: true }
                            }
                        }
                    }
                }
            }
        };

        if (match) {
            cartItem = await prisma.cartItem.update({
                where: { id: match.id },
                data: { quantity: match.quantity + quantity },
                include: includeQuery
            });
        } else {
            cartItem = await prisma.cartItem.create({
                data: { userId, productId, quantity, customization: customization || null },
                include: includeQuery
            });
        }
        
        const formattedItem = {
            ...cartItem,
            product: {
                ...cartItem.product,
                customizationGroups: cartItem.product.customizations.map(c => c.group)
            }
        };

        res.json(formattedItem);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

cartRouter.put('/:id', async (req, res) => {
    const prisma = await getPrismaClient();
    if (!prisma) return res.status(503).json({ error: 'Database not configured' });
    
    const { id } = req.params;
    const { quantity, customization } = req.body;
    try {
        const data: any = {};
        if (quantity !== undefined) data.quantity = quantity;
        if (customization !== undefined) data.customization = customization;

        const cartItem = await prisma.cartItem.update({
            where: { id },
            data,
            include: { 
                product: {
                    include: {
                        customizations: {
                            include: {
                                group: {
                                    include: { choices: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const formattedItem = {
            ...cartItem,
            product: {
                ...cartItem.product,
                customizationGroups: cartItem.product.customizations.map(c => c.group)
            }
        };

        res.json(formattedItem);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

cartRouter.delete('/:id', async (req, res) => {
    const prisma = await getPrismaClient();
    if (!prisma) return res.status(503).json({ error: 'Database not configured' });
    
    const { id } = req.params;
    try {
        await prisma.cartItem.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete from cart' });
    }
});
