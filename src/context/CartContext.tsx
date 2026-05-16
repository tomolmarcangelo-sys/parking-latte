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

  // Load guest cart from localStorage on init
  useEffect(() => {
    const savedCart = localStorage.getItem('parking_latte_guest_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse guest cart', e);
      }
    }
  }, []);

  // Sync with token
  useEffect(() => {
    if (token) {
      fetch('/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        // Simple merge: for now, prioritize backend over localStorage.
        // A smarter merge would reconcile.
        setCart(data);
        localStorage.removeItem('parking_latte_guest_cart');
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

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    if (!token) {
      localStorage.setItem('parking_latte_guest_cart', JSON.stringify(cart));
    }
  }, [cart, token]);

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
      // Optimistic update
      const newItem: CartItem = {
          id: Date.now().toString(), // Temp ID for guest
          userId: 'guest',
          productId: product.id,
          product,
          quantity,
          customization: customization || {},
      };

      setCart(prev => {
          // This logic matches backend-like behavior but is simplistic for now
          return [...prev, newItem];
      });

      toast.success('Added to your guest bag! ☕');

      if (token) {
        try {
          const response = await fetch('/api/cart', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ productId: product.id, quantity, customization })
          });
          const serverItem = await response.json();
          // Replace temp item with server item
          setCart(prev => prev.map(item => item.id === newItem.id ? serverItem : item));
        } catch {
          toast.error('Failed to sync item to server');
        }
      }
  }, [token]);

  const updateCartItem = useCallback(async (cartItemId: string, customization: Record<string, string | string[]>) => {
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, customization } : item));
    
    if (token) {
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
          toast.success('Updated bag');
        } catch {
          toast.error('Failed to sync update');
        }
    } else {
        toast.success('Updated bag');
    }
  }, [token]);

  const removeFromCart = useCallback(async (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
    
    if (token) {
        try {
          await fetch(`/api/cart/${cartItemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          toast.success('Removed from bag');
        } catch {
          toast.error('Failed to sync removal');
        }
    } else {
        toast.success('Removed from bag');
    }
  }, [token]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity } : item));
    
    if (token) {
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
    }
  }, [token]);

  const clearCart = useCallback(() => {
      setCart([]);
      localStorage.removeItem('parking_latte_guest_cart');
  }, []);

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
