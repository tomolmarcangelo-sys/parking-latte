import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, 
  Clock, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ChevronRight,
  Loader2,
  Trash2,
  ShoppingBag,
  Bell,
  MapPin,
  Save,
  User
} from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import { Order, OrderStatus } from '../types';
import toast from 'react-hot-toast';

interface GlobalOrderFeedProps {
  role?: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  filterStatus?: OrderStatus;
  filterActive?: boolean;
}

export const GlobalOrderFeed: React.FC<GlobalOrderFeedProps> = ({ 
  role = 'STAFF',
  filterStatus,
  filterActive = false 
}) => {
  const { orders, loading, updateStatus, deleteOrder, refreshing } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];
    
    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(search) ||
        o.user.name.toLowerCase().includes(search) ||
        o.user.email.toLowerCase().includes(search)
      );
    }
    
    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(order => order.status === filterStatus);
    }
    
    // Active filter
    if (filterActive) {
      filtered = filtered.filter(order => 
        ['PENDING', 'PREPARING', 'READY'].includes(order.status)
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, searchQuery, filterStatus, filterActive]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'PREPARING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'READY': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'COMPLETED': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      case 'CANCELLED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  const getNextStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'Start Brew';
      case 'PREPARING': return 'Mark as Ready';
      case 'READY': return 'Complete/Paid';
      default: return null;
    }
  };

  const getNextStatus = (status: OrderStatus): OrderStatus | null => {
    switch (status) {
      case 'PENDING': return 'PREPARING';
      case 'PREPARING': return 'READY';
      case 'READY': return 'COMPLETED';
      default: return null;
    }
  };

  const handleSaveNote = async (id: string, currentStatus: OrderStatus) => {
    const note = noteInputs[id];
    if (note === undefined) return;
    try {
      await updateStatus(id, currentStatus, note);
      toast.success('Staff note saved');
    } catch (error) {
      // Error handled in updateStatus
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
        <Loader2 className="animate-spin text-brand-primary mb-4" size={32} />
        <p className="font-serif italic text-slate-500">Synchronizing Global Feed...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={24} />
        <input 
          type="text"
          placeholder="Search by Order ID, Customer Name, or Email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-16 pr-6 py-5 bg-white border border-slate-200 focus:border-brand-primary focus:ring-4 ring-brand-primary/5 rounded-2xl outline-none transition-all font-bold text-lg text-slate-900 placeholder:text-slate-400 shadow-sm"
        />
        {refreshing && (
          <RefreshCw className="absolute right-6 top-1/2 -translate-y-1/2 text-brand-primary animate-spin" size={20} />
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/50 border-2 border-dashed border-slate-200 rounded-[40px] text-center">
          <ShoppingBag className="text-slate-200 mb-4" size={64} />
          <p className="font-serif text-2xl italic text-slate-500">No active orders found.</p>
          <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest italic">Great job! All cups are full.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className={`group bg-white rounded-[40px] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col ${
                  order.status === 'READY' ? 'ring-2 ring-green-500 ring-offset-4 ring-offset-slate-50' : ''
                }`}
              >
                {/* Order Header */}
                <div className="p-8 border-b border-slate-50 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs font-black text-brand-primary/60 bg-brand-primary/5 px-2 py-1 rounded-lg">#{order.id.slice(0, 8)}</span>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                        {order.status === 'READY' ? 'READY FOR PICK UP' : order.status}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[#1A1F2E] mb-1">{order.user.name}</h3>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                       <span className="flex items-center gap-1"><Clock size={14} /> {new Date(order.createdAt).toLocaleTimeString()}</span>
                       {role !== 'CUSTOMER' && (
                         <span className="flex items-center gap-1"><User size={14} /> {order.user.email.split('@')[0]}</span>
                       )}
                    </div>
                  </div>
                  {role === 'ADMIN' && (
                    <button 
                      onClick={() => deleteOrder(order.id)}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>

                {/* Order Items */}
                <div className="p-8 space-y-6 flex-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-5">
                      <div className="w-14 h-14 rounded-[20px] bg-brand-primary/5 flex items-center justify-center flex-shrink-0 relative">
                        <Coffee className="text-brand-primary" size={28} />
                        {item.quantity > 1 && (
                          <span className="absolute -top-2 -right-2 bg-[#1A1F2E] text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                            {item.quantity}x
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg text-[#1A1F2E] mb-1">{item.product.name}</p>
                        {item.customization && Object.keys(item.customization).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(item.customization as Record<string, string | string[]>).map(([key, value], i) => {
                              const values = Array.isArray(value) ? value : [value];
                              return values.map((v, j) => (
                                <span key={`${i}-${j}`} className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                  {key}: {v}
                                </span>
                              ));
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Staff Notes Section */}
                  {role !== 'CUSTOMER' && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            placeholder="Staff Notes..."
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-primary transition-all"
                            value={noteInputs[order.id] ?? order.staffNotes ?? ''}
                            onChange={(e) => setNoteInputs(prev => ({...prev, [order.id]: e.target.value}))}
                          />
                        </div>
                        <button 
                          onClick={() => handleSaveNote(order.id, order.status)}
                          className="p-4 bg-slate-100 text-slate-400 hover:bg-brand-primary/10 hover:text-brand-primary rounded-2xl transition-all"
                          title="Save Note"
                        >
                          <Save size={20} />
                        </button>
                      </div>
                      {order.lastUpdatedBy && (
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">
                          Last Updated By: {order.lastUpdatedBy}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress Visual */}
                <div className="px-8 mb-4">
                   <div className="flex gap-1">
                      <div className={`h-1.5 flex-1 rounded-full ${['PENDING', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status) ? 'bg-amber-500' : 'bg-slate-100'}`} />
                      <div className={`h-1.5 flex-1 rounded-full ${['PREPARING', 'READY', 'COMPLETED'].includes(order.status) ? 'bg-blue-500' : 'bg-slate-100'}`} />
                      <div className={`h-1.5 flex-1 rounded-full ${['READY', 'COMPLETED'].includes(order.status) ? 'bg-green-500' : 'bg-slate-100'}`} />
                      <div className={`h-1.5 flex-1 rounded-full ${order.status === 'COMPLETED' ? 'bg-slate-400' : 'bg-slate-100'}`} />
                   </div>
                </div>

                {/* Action Bar */}
                <div className="p-8 pt-0">
                  {getNextStatusLabel(order.status) && role !== 'CUSTOMER' ? (
                    <button
                      onClick={() => updateStatus(order.id, getNextStatus(order.status)!)}
                      className={`w-full py-5 rounded-[22px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm ${
                        order.status === 'PENDING' ? 'bg-[#1A1F2E] text-white hover:bg-black' :
                        order.status === 'PREPARING' ? 'bg-brand-primary text-white hover:bg-[#c4a675] shadow-brand-primary/20 hover:shadow-lg' :
                        'bg-green-600 text-white hover:bg-green-700 shadow-green-200 hover:shadow-lg'
                      }`}
                    >
                      {order.status === 'READY' ? <Bell size={18} /> : <ChevronRight size={18} />}
                      {getNextStatusLabel(order.status)}
                    </button>
                  ) : order.status === 'COMPLETED' ? (
                    <div className="flex items-center justify-center gap-3 py-5 bg-slate-50 rounded-[22px] text-slate-400 font-black text-xs uppercase tracking-[0.2em]">
                      <CheckCircle2 size={20} className="text-green-500" />
                      Order Finalized
                    </div>
                  ) : role === 'CUSTOMER' ? (
                    <div className="flex items-center justify-center gap-3 py-5 bg-brand-primary/5 rounded-[22px] text-brand-primary font-black text-xs uppercase tracking-[0.2em]">
                      <Loader2 size={20} className="animate-spin" />
                      {order.status === 'PENDING' ? 'Queued' : order.status === 'PREPARING' ? 'Brewing' : 'Ready'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 py-5 bg-slate-50 rounded-[22px] text-slate-400 font-black text-xs uppercase tracking-[0.2em]">
                       No further actions
                    </div>
                  )}
                </div>

                {/* Order Footer */}
                <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                      <MapPin size={14} className="text-slate-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Counter</span>
                  </div>
                  <span className="text-lg font-black text-[#1A1F2E]">₱{Number(order.totalAmount).toFixed(2)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default GlobalOrderFeed;
