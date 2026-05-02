import { prisma } from '../db.js';

export enum AuditAction {
  ROLE_CHANGE = 'ROLE_CHANGE',
  STOCK_UPDATE = 'STOCK_UPDATE',
  STOCK_CREATE = 'STOCK_CREATE',
  PRICE_UPDATE = 'PRICE_UPDATE',
  CATEGORY_CREATE = 'CATEGORY_CREATE',
  CATEGORY_UPDATE = 'CATEGORY_UPDATE',
  CATEGORY_DELETE = 'CATEGORY_DELETE',
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  CUSTOMIZATION_GROUP_CREATE = 'CUSTOMIZATION_GROUP_CREATE',
  CUSTOMIZATION_GROUP_DELETE = 'CUSTOMIZATION_GROUP_DELETE',
}

interface AuditParams {
  action: AuditAction;
  adminId: string;
  targetId?: string;
  targetName?: string;
  details: any;
}

export const createAuditLog = async ({ action, adminId, targetId, targetName, details }: AuditParams) => {
  try {
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    
    await prisma.auditLog.create({
      data: {
        action,
        adminId,
        adminName: admin?.name || admin?.email,
        targetId: targetId || 'SYSTEM',
        targetName: targetName || 'System',
        details,
      },
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};
