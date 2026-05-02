import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.get('/stats', authenticate, authorize(['ADMIN']), adminController.getDashboardStats);
adminRouter.get('/users', authenticate, authorize(['ADMIN']), adminController.getAllUsers);
adminRouter.get('/audit-logs', authenticate, authorize(['ADMIN']), adminController.getAuditLogs);
adminRouter.put('/users/role', authenticate, authorize(['ADMIN']), adminController.updateUserRole);

adminRouter.get('/customizations', authenticate, authorize(['ADMIN']), adminController.getAllCustomizations);
adminRouter.post('/customizations/group', authenticate, authorize(['ADMIN']), adminController.createCustomizationGroup);
adminRouter.put('/customizations/group/:id', authenticate, authorize(['ADMIN']), adminController.updateCustomizationGroup);
adminRouter.delete('/customizations/group/:id', authenticate, authorize(['ADMIN']), adminController.deleteCustomizationGroup);
adminRouter.post('/customizations/choice', authenticate, authorize(['ADMIN']), adminController.createCustomizationChoice);
adminRouter.delete('/customizations/choice/:id', authenticate, authorize(['ADMIN']), adminController.deleteCustomizationChoice);
