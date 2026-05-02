export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
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
  choices: CustomizationChoice[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  customizationGroups?: CustomizationGroup[];
}

export interface CartItem extends Product {
  quantity: number;
  customization?: Record<string, string>; // Group Name -> Choice Name
  selectedChoices?: CustomizationChoice[]; // To track total cost better
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  user: { name: string; email: string };
  createdAt: string;
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
  lowStockThreshold: number;
}
