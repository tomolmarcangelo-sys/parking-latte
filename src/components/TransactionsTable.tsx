import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../lib/api';
import { Order, OrderStatus } from '../types';
import { Search, Calendar, ArrowUpDown, RefreshCw, Eye, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export const TransactionsTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  
  // Sorting
  const [sortField, setSortField] = useState<'createdAt' | 'totalAmount' | 'id'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/orders');
      setOrders(data);
    } catch (error) {
      toast.error('Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesSearch = 
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.user.email.toLowerCase().includes(searchQuery.toLowerCase());
          
        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
        
        let matchesDate = true;
        const orderDate = new Date(order.createdAt).getTime();
        
        if (dateRange.start) {
          const startDate = new Date(dateRange.start).getTime();
          if (orderDate < startDate) matchesDate = false;
        }
        
        if (dateRange.end) {
          const endDate = new Date(dateRange.end).getTime();
          // Add 24h to include the whole end day
          if (orderDate > endDate + 86400000) matchesDate = false;
        }

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        
        if (sortField === 'createdAt') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        } else if (sortField === 'totalAmount') {
          valA = Number(valA);
          valB = Number(valB);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [orders, searchQuery, statusFilter, dateRange, sortField, sortOrder]);

  const handleSort = (field: 'createdAt' | 'totalAmount' | 'id') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'PREPARING': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'READY': return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search Order ID, Customer Name, Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-medium"
          />
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-bold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-brand-primary transition-colors">
            <Calendar size={18} className="text-slate-400" />
            <input 
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
              className="bg-transparent text-sm outline-none font-medium text-slate-600"
            />
            <span className="text-slate-400">to</span>
            <input 
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
              className="bg-transparent text-sm outline-none font-medium text-slate-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-100 transition-colors">
                 <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('id')}>
                   <div className="flex items-center gap-2">Order ID <ArrowUpDown size={14} /></div>
                 </th>
                 <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E]">
                   Customer
                 </th>
                 <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-2">Date & Time <ArrowUpDown size={14} /></div>
                 </th>
                 <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E]">
                   Status
                 </th>
                 <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalAmount')}>
                    <div className="flex items-center gap-2">Total Amount <ArrowUpDown size={14} /></div>
                 </th>
                 <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E]">
                   Staff Notes
                 </th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {loading ? (
                 <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                     <div className="flex flex-col items-center gap-3">
                       <RefreshCw className="animate-spin text-brand-secondary" size={24} />
                       <span className="font-bold tracking-tight">Fetching Master Records...</span>
                     </div>
                   </td>
                 </tr>
               ) : filteredAndSortedOrders.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                     <p className="font-serif italic text-xl">No transactions found matching criteria.</p>
                   </td>
                 </tr>
               ) : (
                 filteredAndSortedOrders.map((order, index) => (
                   <tr key={order.id} className={`hover:bg-slate-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>
                     <td className="px-6 py-4 font-mono text-sm font-bold text-slate-700">
                        #{order.id.slice(0, 8)}
                     </td>
                     <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{order.user.name}</p>
                        <p className="text-xs text-slate-500">{order.user.email}</p>
                     </td>
                     <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                        {new Date(order.createdAt).toLocaleString()}
                     </td>
                     <td className="px-6 py-4">
                       <span className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest border rounded-md ${getStatusColor(order.status)}`}>
                         {order.status}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-sm font-black font-sans text-brand-primary">
                        ₱{Number(order.totalAmount).toFixed(2)}
                     </td>
                     <td className="px-6 py-4">
                        {order.staffNotes ? (
                           <p className="text-xs text-slate-500 max-w-[200px] truncate" title={order.staffNotes}>{order.staffNotes}</p>
                        ) : (
                           <span className="text-xs text-slate-300 italic">-</span>
                        )}
                        {order.lastUpdatedBy && (
                           <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">By: {order.lastUpdatedBy}</p>
                        )}
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>
         <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-sm font-bold text-slate-500">
            <span>Showing {filteredAndSortedOrders.length} transactions</span>
         </div>
      </div>
    </div>
  );
};
