import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const orderRouter = Router();

orderRouter.use(authenticate);
orderRouter.get('/', orderController.getOrders);
orderRouter.post('/', orderController.createOrder); // Customers can place orders
orderRouter.patch('/:id/status', authorize(['STAFF', 'ADMIN']), orderController.updateOrderStatus);
