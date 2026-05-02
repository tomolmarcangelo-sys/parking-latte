import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const inventoryRouter = Router();

inventoryRouter.use(authenticate, authorize(['ADMIN', 'STAFF']));
inventoryRouter.get('/', inventoryController.getInventory);
inventoryRouter.post('/', authorize(['ADMIN']), inventoryController.createInventoryItem);
inventoryRouter.patch('/:id/stock', inventoryController.updateStock);
