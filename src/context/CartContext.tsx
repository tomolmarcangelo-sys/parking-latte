import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CartItem, Product, CustomizationChoice } from '../types';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, customization?: Record<string, string | string[]>, selectedChoices?: CustomizationChoice[], quantity?: number) => void;
  updateCartItem: (cartItemId: string, customization: Record<string, string | string[]>) => Promise<void>;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  calculateItemPrice: (item: CartItem | Product, selectedChoices?: CustomizationChoice[]) => number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setCart(data);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load cart');
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const calculateItemPrice = useCallback((item: CartItem | Product, selectedChoices?: CustomizationChoice[]) => {
    const product = (item as CartItem).product || (item as Product);
    const basePrice = Number(product.price);
    
    // If selectedChoices is provided externally (e.g. from ProductModal)
    if (selectedChoices) {
      const modifiers = selectedChoices.reduce((acc, c) => acc + Number(c.priceModifier), 0);
      return basePrice + modifiers;
    }

    // Otherwise, try to infer from item.customization + product.customizationGroups
    let modifiers = 0;
    const cartItem = item as CartItem;
    if (cartItem.customization && product.customizationGroups) {
      const custIdsOrNames = cartItem.customization;
      product.customizationGroups.forEach(group => {
        const selection = custIdsOrNames[group.name];
        if (selection) {
          const names = Array.isArray(selection) ? selection : [selection];
          names.forEach(name => {
            const choice = group.choices.find(c => c.name === name);
            if (choice) {
              modifiers += Number(choice.priceModifier);
            }
          });
        }
      });
    }

    return basePrice + modifiers;
  }, []);

  const addToCart = useCallback(async (product: Product, customization?: Record<string, string | string[]>, _selectedChoices?: CustomizationChoice[], quantity: number = 1) => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ productId: product.id, quantity, customization })
      });
      const newItem = await response.json();
      
      setCart(prev => {
          const existingItemIndex = prev.findIndex(item => item.id === newItem.id);
          if (existingItemIndex > -1) {
              const newCart = [...prev];
              newCart[existingItemIndex] = newItem;
              return newCart;
          }
          return [...prev, newItem];
      });

      toast.success('Added to bag');
    } catch {
      toast.error('Failed to add to bag');
    }
  }, [token]);

  const updateCartItem = useCallback(async (cartItemId: string, customization: Record<string, string | string[]>) => {
    if (!token) return;
    
    try {
      const response = await fetch(`/api/cart/${cartItemId}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ customization })
      });
      const updatedItem = await response.json();
      setCart(prev => prev.map(item => item.id === cartItemId ? updatedItem : item));
      toast.success('Updated brew');
    } catch {
      toast.error('Failed to update brew');
    }
  }, [token]);

  const removeFromCart = useCallback(async (cartItemId: string) => {
    if (!token) return;
    
    setCart(prev => prev.filter(item => item.id !== cartItemId));
    
    try {
      await fetch(`/api/cart/${cartItemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Removed from bag');
    } catch {
      // Re-fetch cart on error to be safe instead of manual rollback
      fetch('/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setCart(data));
      toast.error('Failed to remove item');
    }
  }, [token]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (!token) return;
    
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity } : item));
    
    try {
      await fetch(`/api/cart/${cartItemId}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ quantity })
      });
    } catch {
      toast.error('Failed to update quantity');
    }
  }, [token]);

  const clearCart = useCallback(() => setCart([]), []);

  const total = useMemo(() => {
    return cart.reduce((acc, item) => acc + calculateItemPrice(item) * item.quantity, 0);
  }, [cart, calculateItemPrice]);

  const contextValue = useMemo(() => ({ 
    cart, 
    addToCart, 
    updateCartItem,
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    total,
    calculateItemPrice,
    isLoading
  }), [cart, addToCart, updateCartItem, removeFromCart, updateQuantity, clearCart, total, calculateItemPrice, isLoading]);

  return (
    <CartContext.Provider value={contextValue}>
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
