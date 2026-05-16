import React from 'react';
import { Package, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { InventoryItem } from '../types';
import SkeletonLoader from './SkeletonLoader';

interface StockInventoryListProps {
  inventory: InventoryItem[];
  loading: boolean;
  onOpenModal: () => void;
  onRestock?: (id: string, amount: number) => void;
}

export const StockInventoryList: React.FC<StockInventoryListProps> = React.memo(({ 
  inventory, 
  loading, 
  onOpenModal
}) => {
  if (loading) {
    return (
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all">
        <div className="flex justify-between items-center mb-10">
          <SkeletonLoader className="w-48 h-8" />
          <SkeletonLoader className="w-10 h-10 rounded-xl" />
        </div>
        <div className="space-y-5">
          {[1, 2, 3, 4].map(i => <SkeletonLoader key={i} className="w-full h-24 rounded-xl" />)}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-serif font-bold text-[#1A1F2E] flex items-center gap-3">
          <Package size={24} className="text-[#1A1F2E]" />
          Stock Inventory
        </h2>
        <button 
          onClick={onOpenModal}
          className="w-10 h-10 bg-[#1A1F2E] text-white rounded-xl flex items-center justify-center hover:bg-[#1A1F2E]/90 transition-all shadow-sm"
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="space-y-5 max-h-[400px] overflow-y-auto pr-4 no-scrollbar border-t border-slate-100 pt-5">
        {inventory.map((item, index) => {
          const isLow = item.stockLevel <= item.lowStockThreshold;
          const isCritical = item.stockLevel === 0;
          return (
            <div 
              key={item.id} 
              className={`flex flex-col gap-2 p-4 rounded-xl transition-all border ${
                index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
              } ${
                isCritical
                  ? 'border-red-200 bg-red-50'
                  : isLow 
                    ? 'border-orange-200 bg-orange-50' 
                    : 'border-transparent hover:bg-slate-100'
              }`}
            >
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500 animate-pulse' : 'bg-[#1A1F2E]'}`}></div>
                  <span className="font-bold text-[#1A1F2E]">{item.name}</span>
                  {isLow && (
                    <span className={`text-[8px] text-white px-2 py-0.5 rounded-md font-black uppercase tracking-tight shadow-sm ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
                      {isCritical ? 'Depleted' : 'Low Stock'}
                    </span>
                  )}
                </div>
                <span className={`font-bold ${isLow ? 'text-red-600' : 'text-[#64748B]'}`}>
                  {item.stockLevel} {item.unit}
                </span>
              </div>
              
              {((item as any).products?.length > 0 || (item as any).customizations?.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(item as any).products?.map((p: any, pIdx: number) => (
                    <span key={`p-${p.productId}-${pIdx}`} className="text-[10px] bg-slate-100 text-[#64748B] px-2 py-0.5 rounded font-medium border border-slate-200">
                      {p.product.name}
                    </span>
                  ))}
                  {(item as any).customizations?.map((c: any, cIdx: number) => (
                    <span key={`c-${c.choiceId}-${cIdx}`} className="text-[10px] bg-brand-primary/5 text-brand-primary px-2 py-0.5 rounded font-medium border border-brand-primary/10">
                      {c.choice.group.name}: {c.choice.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (item.stockLevel / (item.lowStockThreshold * 5)) * 100)}%` }}
                  className={`h-full ${isLow ? 'bg-red-500' : 'bg-[#1A1F2E]'}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <button 
        onClick={onOpenModal}
        className="w-full mt-10 py-4 border-2 border-[#1A1F2E] text-[#1A1F2E] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#1A1F2E] hover:text-white transition-all"
      >
        Replenish Stock
      </button>
    </section>
  );
});

StockInventoryList.displayName = 'StockInventoryList';
