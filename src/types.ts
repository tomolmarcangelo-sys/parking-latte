export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  emailVerified?: boolean;
}

export interface Category {
  id: string;
  name: string;
  products: Product[];
}

export interface CustomizationChoice {
  id: string;
  name: string;
  priceModifier: number;
}

export interface CustomizationGroup {
  id: string;
  name: string;
  required: boolean;
  allowMultiple?: boolean;
  choices: CustomizationChoice[];
  products: { productId: string; product: Product }[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVisible: boolean;
  categoryId: string;
  customizationGroups?: CustomizationGroup[];
  ingredients?: ProductIngredient[];
}

export interface ProductIngredient {
  id: string;
  productId: string;
  inventoryItemId: string;
  quantityNeeded: number;
  product?: Product;
}

export interface CustomizationIngredient {
  id: string;
  choiceId: string;
  inventoryItemId: string;
  quantityNeeded: number;
  choice?: CustomizationChoice;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  quantity: number;
  customization?: any;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  user: { name: string; email: string };
  createdAt: string;
  staffNotes?: string;
  lastUpdatedBy?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  priceAtOrder: number;
  customization?: any;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  stockLevel: number;
  projectedStock?: number;
  lowStockThreshold: number;
  updatedAt: string;
  products?: ProductIngredient[];
  customizations?: CustomizationIngredient[];
}
