import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Coffee, X, Shield, Check, ArrowUpRight, Minus, Plus } from 'lucide-react';
import { Product, CustomizationChoice } from '../types';
import { useCart } from '../context/CartContext';

const ImageWithFallback: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const fallbackImage = 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=600&q=80';

  return (
    <div className="w-full h-full relative">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-bg-sidebar animate-pulse flex items-center justify-center">
          <Coffee size={24} className="text-brand-secondary opacity-20" />
        </div>
      )}
      <img 
        src={hasError || !src ? fallbackImage : src} 
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export const ProductModal: React.FC<{ 
  product: Product; 
  initialCustomization?: Record<string, string | string[]>;
  isEditing?: boolean;
  onClose: () => void; 
  onAdd: (customization: Record<string, string | string[]>, choices: CustomizationChoice[], quantity?: number) => void 
}> = ({ product, initialCustomization, isEditing, onClose, onAdd }) => {
  const [selections, setSelections] = useState<Record<string, string | string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const { calculateItemPrice } = useCart();
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialCustomization) {
      setSelections(initialCustomization);
    } else {
      const initial: Record<string, string | string[]> = {};
      product.customizationGroups?.forEach(group => {
        if (group.required && group.choices.length > 0) {
          if (group.allowMultiple) {
            initial[group.name] = [group.choices[0].name];
          } else {
            initial[group.name] = group.choices[0].name;
          }
        }
      });
      setSelections(initial);
    }
  }, [product, initialCustomization]);

  const toggleChoice = (groupName: string, choiceName: string, isRequired: boolean, allowMultiple?: boolean) => {
    setSelections(prev => {
      if (allowMultiple) {
        const current = Array.isArray(prev[groupName]) ? (prev[groupName] as string[]) : [];
        if (current.includes(choiceName)) {
          const nextChoices = current.filter(c => c !== choiceName);
          if (nextChoices.length === 0 && !isRequired) {
            const next = { ...prev };
            delete next[groupName];
            return next;
          }
          if (nextChoices.length === 0 && isRequired) return prev;
          return { ...prev, [groupName]: nextChoices };
        } else {
          return { ...prev, [groupName]: [...current, choiceName] };
        }
      }

      if (isRequired) {
        return { ...prev, [groupName]: choiceName };
      }
      if (prev[groupName] === choiceName) {
        const next = { ...prev };
        delete next[groupName];
        return next;
      }
      return { ...prev, [groupName]: choiceName };
    });
  };

  const getSelectedChoices = () => {
    const choices: CustomizationChoice[] = [];
    product.customizationGroups?.forEach(group => {
      const selectedNames = selections[group.name];
      if (Array.isArray(selectedNames)) {
        selectedNames.forEach(selectedName => {
          const choice = group.choices.find(c => c.name === selectedName);
          if (choice) choices.push(choice);
        });
      } else if (selectedNames) {
        const choice = group.choices.find(c => c.name === selectedNames);
        if (choice) choices.push(choice);
      }
    });
    return choices;
  };

  const totalPrice = calculateItemPrice(product, getSelectedChoices()) * quantity;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 30, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl sm:rounded-[48px] overflow-hidden shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[85vh] border border-white/10"
      >
        <div className="relative h-64 sm:h-80 flex-shrink-0 group">
          <ImageWithFallback src={product.imageUrl} alt={product.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
          
          <div className="absolute top-6 left-8 right-8 flex justify-between items-start">
            <button 
              onClick={onClose}
              className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all shadow-xl group/close"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <div className="bg-brand-primary text-white px-6 py-2 rounded-full font-serif font-bold text-lg shadow-2xl border border-white/10">
              ₱{Number(product.price).toFixed(2)}
            </div>
          </div>

          <div className="absolute bottom-8 left-8 right-8">
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2 tracking-tight">{product.name}</h2>
            <p className="text-white/70 text-sm font-medium line-clamp-2 max-w-lg">{product.description}</p>
          </div>
        </div>

        <div 
          ref={modalContentRef}
          className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-12 custom-scrollbar bg-slate-50 dark:bg-slate-900/50"
        >
          {product.customizationGroups?.map((group) => (
            <section key={group.id} className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    {group.name}
                  </h3>
                  {group.required && (
                    <p className="text-[9px] font-bold text-brand-secondary uppercase tracking-widest flex items-center gap-1">
                      <Shield size={10} /> Essential Selection
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.choices.map((choice) => {
                  const isSelected = Array.isArray(selections[group.name]) 
                    ? (selections[group.name] as string[]).includes(choice.name)
                    : selections[group.name] === choice.name;

                  return (
                    <motion.button
                      key={choice.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleChoice(group.name, choice.name, group.required, group.allowMultiple)}
                      className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all group/choice ${
                        isSelected 
                          ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20 bg-gradient-to-br from-brand-primary to-brand-secondary/80' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-primary/30 dark:hover:border-brand-secondary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-white border-white' 
                            : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {isSelected && <Check size={12} className="text-brand-primary font-bold" />}
                        </div>
                        <span className="text-sm font-bold tracking-tight">{choice.name}</span>
                      </div>
                      
                      {Number(choice.priceModifier) > 0 && (
                        <span className={`font-mono text-xs font-bold ${
                          isSelected ? 'text-white/80' : 'text-brand-primary dark:text-brand-secondary'
                        }`}>
                          +₱{Number(choice.priceModifier).toFixed(2)}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="p-8 sm:p-10 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl relative z-20 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 w-full sm:w-auto">
              <div className="flex justify-between items-end mb-1">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Crafted Total</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 transition-colors">
                  ₱{totalPrice.toFixed(2)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">/ cup</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center bg-[#1a1f2e] rounded-2xl border border-slate-700/50 p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-brand-secondary hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  <Minus size={18} />
                </button>
                <div className="w-12 text-center font-serif text-lg font-bold text-white">
                  {quantity}
                </div>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center text-brand-secondary hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              <button 
                onClick={() => onAdd(selections, getSelectedChoices(), quantity)}
                className="w-full sm:w-auto sm:px-12 bg-brand-primary text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-brand-secondary transition-all shadow-2xl shadow-brand-primary/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 group/add"
              >
                <span>{isEditing ? 'Update Brew' : 'Add to Bag'}</span>
                <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
