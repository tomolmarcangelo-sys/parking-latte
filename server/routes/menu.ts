import { Router } from 'express';
import * as menuController from '../controllers/menuController.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const menuRouter = Router();

menuRouter.get('/', menuController.getMenu);
menuRouter.get('/categories', menuController.getCategories);
menuRouter.post('/categories', authenticate, authorize(['ADMIN']), menuController.createCategory);
menuRouter.put('/categories/:id', authenticate, authorize(['ADMIN']), menuController.updateCategory);
menuRouter.delete('/categories/:id', authenticate, authorize(['ADMIN']), menuController.deleteCategory);
menuRouter.post('/', authenticate, authorize(['ADMIN']), menuController.createProduct);
menuRouter.put('/:id', authenticate, authorize(['ADMIN']), menuController.updateProduct);
menuRouter.delete('/:id', authenticate, authorize(['ADMIN']), menuController.deleteProduct);
