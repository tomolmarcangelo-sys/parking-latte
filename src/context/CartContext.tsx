import React, { createContext, useContext, useState } from 'react';
import { CartItem, Product, CustomizationChoice } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, customization?: Record<string, string>, selectedChoices?: CustomizationChoice[]) => void;
  removeFromCart: (productId: string, customization?: Record<string, string>) => void;
  updateQuantity: (productId: string, customization: Record<string, string> | undefined, delta: number) => void;
  clearCart: () => void;
  total: number;
  calculateItemPrice: (item: CartItem | Product, selectedChoices?: CustomizationChoice[]) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const calculateItemPrice = (item: CartItem | Product, selectedChoices?: CustomizationChoice[]) => {
    const basePrice = Number(item.price);
    const choices = selectedChoices || (item as CartItem).selectedChoices || [];
    const modifiers = choices.reduce((acc, c) => acc + Number(c.priceModifier), 0);
    return basePrice + modifiers;
  };

  const addToCart = (product: Product, customization?: Record<string, string>, selectedChoices: CustomizationChoice[] = []) => {
    // Generate a unique ID for this specific combination in the cart
    const cartItemId = `${product.id}-${JSON.stringify(customization)}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => 
        item.id === product.id && 
        JSON.stringify(item.customization) === JSON.stringify(customization)
      );

      if (existingIdx > -1) {
        const newCart = [...prev];
        newCart[existingIdx] = { 
          ...newCart[existingIdx], 
          quantity: newCart[existingIdx].quantity + 1 
        };
        return newCart;
      }

      return [...prev, { ...product, quantity: 1, customization, selectedChoices }];
    });
  };

  const removeFromCart = (productId: string, customization?: Record<string, string>) => {
    setCart((prev) => prev.filter((item) => 
      !(item.id === productId && JSON.stringify(item.customization) === JSON.stringify(customization))
    ));
  };

  const updateQuantity = (productId: string, customization: Record<string, string> | undefined, delta: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.id === productId && JSON.stringify(item.customization) === JSON.stringify(customization)) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => acc + calculateItemPrice(item) * item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      total,
      calculateItemPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
