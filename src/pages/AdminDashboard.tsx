import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { InventoryItem, Category, User, Role, CustomizationGroup, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Plus, BarChart3, TrendingUp, AlertTriangle, X, Coffee, Download, Users, Shield, Check, Settings2, Trash2, Edit3, Link as LinkIcon, Info, ImagePlus, Upload, History, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'variations' | 'categories' | 'audit-logs'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [customizations, setCustomizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryList, setCategoryList] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const allProducts = categories.flatMap(c => c.products);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/admin/stats'),
      apiClient.get('/inventory'),
      apiClient.get('/menu'),
      apiClient.get('/admin/users'),
      apiClient.get('/admin/customizations'),
      apiClient.get('/menu/categories'),
      apiClient.get('/admin/audit-logs')
    ]).then(([statsData, invData, menuData, userData, customData, categoryData, auditData]) => {
      setStats(statsData);
      setInventory(invData);
      setCategories(menuData);
      setUsers(userData);
      setCustomizations(customData);
      setCategoryList(categoryData);
      setAuditLogs(auditData);
      setLoading(false);
    });
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await apiClient.delete(`/menu/categories/${id}`);
      fetchData();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete category';
      alert(message);
    }
  };

  const handleUpdateRole = async (userId: string, role: Role) => {
    try {
      await apiClient.put('/admin/users/role', { userId, role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Unauthorized or server error.');
    }
  };

  const handleExportOrders = async () => {
    setIsExporting(true);
    try {
      const orders = await apiClient.get('/orders');
      
      const headers = ['Order ID', 'Customer', 'Email', 'Status', 'Total (₱)', 'Date', 'Items'];
      const rows = orders.map((order: any) => [
        order.id,
        order.user.name || 'N/A',
        order.user.email,
        order.status,
        Number(order.totalAmount).toFixed(2),
        new Date(order.createdAt).toLocaleString(),
        order.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join('; ')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `parking_latte_orders_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export orders.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <div>Loading Intelligence...</div>;

  const lowStockItems = inventory.filter(i => i.stockLevel <= i.lowStockThreshold);

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-serif font-bold text-brand-primary">Management Suite</h1>
            <p className="text-text-muted">Business analytics and resource planning.</p>
          </div>
          
          <div className="flex bg-bg-sidebar dark:bg-bg-sidebar/50 p-1 rounded-2xl w-fit border border-border-subtle">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white dark:bg-bg-sidebar text-brand-primary shadow-sm' : 'text-text-muted hover:text-brand-primary'}`}
            >
              <BarChart3 size={16} />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white dark:bg-bg-sidebar text-brand-primary shadow-sm' : 'text-text-muted hover:text-brand-primary'}`}
            >
              <Users size={16} />
              User Roles
            </button>
            <button 
              onClick={() => setActiveTab('variations')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'variations' ? 'bg-white dark:bg-bg-sidebar text-brand-primary shadow-sm' : 'text-text-muted hover:text-brand-primary'}`}
            >
              <Settings2 size={16} />
              Product Variations
            </button>
            <button 
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-white dark:bg-bg-sidebar text-brand-primary shadow-sm' : 'text-text-muted hover:text-brand-primary'}`}
            >
              <Package size={16} />
              Categories
            </button>
            <button 
              onClick={() => setActiveTab('audit-logs')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'audit-logs' ? 'bg-white dark:bg-bg-sidebar text-brand-primary shadow-sm' : 'text-text-muted hover:text-brand-primary'}`}
            >
              <History size={16} />
              Audit Logs
            </button>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={handleExportOrders}
            disabled={isExporting}
            className="flex-1 md:flex-none border-2 border-brand-primary text-brand-primary px-6 py-4 rounded-2xl font-bold hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <div className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div> : <Download size={18} />}
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 md:flex-none bg-brand-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3"
          >
            <Plus size={20} />
            <span>New Product</span>
          </button>
        </div>
      </header>

      {activeTab === 'overview' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard 
              icon={<TrendingUp className="text-brand-accent" />} 
              label="Total Revenue" 
              value={`₱${Number(stats?.totalRevenue || 0).toFixed(2)}`} 
            />
            <StatCard 
              icon={<Package className="text-brand-secondary" />} 
              label="Total Orders" 
              value={stats?.totalOrders || 0} 
            />
            <StatCard 
              icon={<Plus className="text-brand-primary" />} 
              label="Orders Today" 
              value={stats?.todayOrders || 0} 
            />
          </div>

          {lowStockItems.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-brand-danger" size={20} />
                <h2 className="text-xl font-serif font-bold text-brand-primary">Low Stock Alerts</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {lowStockItems.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border border-brand-danger/20 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden group shadow-sm"
                  >
                    <div className="absolute top-0 right-0 p-2 bg-brand-danger/10 group-hover:bg-brand-danger/20 transition-colors">
                      <AlertTriangle size={14} className="text-brand-danger" />
                    </div>
                    <p className="text-[10px] font-bold text-brand-danger uppercase tracking-widest">Reorder Level</p>
                    <h3 className="font-bold text-brand-primary truncate">{item.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-brand-danger">{item.stockLevel}</span>
                      <span className="text-xs text-text-muted font-bold">{item.unit} left</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Sales Chart */}
            <section className="bg-white dark:bg-bg-sidebar/50 p-10 rounded-[32px] coffee-shadow border border-border-subtle transition-colors">
              <h2 className="text-2xl font-serif font-bold text-brand-primary mb-10 flex items-center gap-3">
                <BarChart3 size={24} className="text-brand-secondary" />
                Product Demand
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.topProducts || []}>
                    <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} tick={{ fill: '#8A7A6E' }} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#F7F1E9' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(74,55,40,0.1)', padding: '15px' }}
                    />
                    <Bar dataKey="quantity" fill="#C8A97E" radius={[12, 12, 0, 0]} barSize={40}>
                      {stats?.topProducts?.map((_entry:any, index:number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4A3728' : '#C8A97E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Inventory Table */}
            <section className="bg-white dark:bg-bg-sidebar/50 p-10 rounded-[32px] coffee-shadow border border-border-subtle transition-colors">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-serif font-bold text-brand-primary flex items-center gap-3">
                  <Package size={24} className="text-brand-secondary" />
                  Stock Inventory
                </h2>
                <button 
                  onClick={() => setIsInventoryModalOpen(true)}
                  className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-5 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {inventory.map((item) => {
                  const isLow = item.stockLevel <= item.lowStockThreshold;
                  return (
                    <div 
                      key={item.id} 
                      className={`flex flex-col gap-2 p-4 rounded-2xl transition-all ${
                        isLow ? 'bg-red-50/50 border border-brand-danger/10 shadow-inner' : 'hover:bg-bg-sidebar/50'
                      }`}
                    >
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-brand-danger animate-pulse' : 'bg-brand-secondary'}`}></div>
                          <span className="font-bold text-brand-primary">{item.name}</span>
                          {isLow && (
                            <span className="text-[8px] bg-brand-danger text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Low</span>
                          )}
                        </div>
                        <span className={`font-bold ${isLow ? 'text-brand-danger' : 'text-text-muted'}`}>
                          {item.stockLevel} {item.unit}
                        </span>
                      </div>
                      <div className="w-full bg-border-subtle/50 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (item.stockLevel / (item.lowStockThreshold * 5)) * 100)}%` }}
                          className={`h-full ${isLow ? 'bg-brand-danger' : 'bg-brand-secondary'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="w-full mt-10 py-4 border-2 border-brand-primary text-brand-primary rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all">
                Replenish Stock
              </button>
            </section>
          </div>
        </>
      ) : activeTab === 'users' ? (
        <section className="bg-white dark:bg-bg-sidebar/50 rounded-[32px] coffee-shadow border border-border-subtle overflow-hidden transition-colors">
          <div className="p-8 md:p-12 border-b border-border-subtle bg-bg-sidebar/20 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-2xl border border-border-subtle flex items-center justify-center text-brand-primary shadow-sm">
                 <Users size={24} />
               </div>
               <div>
                  <h2 className="text-2xl font-serif font-bold text-brand-primary">Personnel Directory</h2>
                  <p className="text-sm text-text-muted font-medium">Assign roles and manage system permissions.</p>
               </div>
            </div>
            <div className="hidden md:flex bg-brand-secondary/10 px-4 py-2 rounded-xl items-center gap-2">
              <Shield size={16} className="text-brand-secondary" />
              <span className="text-xs font-bold text-brand-secondary uppercase tracking-widest">{users.length} Active Users</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-sidebar/10">
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">User Profile</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Current Role</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {users.map((u) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={u.id} 
                    className="hover:bg-bg-sidebar/30 transition-all group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-primary/5 flex items-center justify-center text-brand-primary font-serif font-bold text-xl border border-brand-primary/10">
                          {u.name?.[0] || u.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-brand-primary text-lg">{u.name || 'Anonymous'}</p>
                          <p className="text-sm text-text-muted font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-2">
                         {(['CUSTOMER', 'STAFF', 'ADMIN'] as Role[]).map((r) => (
                           <button
                            key={r}
                            onClick={() => handleUpdateRole(u.id, r)}
                            disabled={u.role === r}
                            className={`
                              px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all
                              ${u.role === r 
                                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 cursor-default' 
                                : 'bg-bg-sidebar text-text-muted hover:text-brand-primary hover:bg-white border border-border-subtle/50'
                              }
                            `}
                           >
                             {u.role === r && <Check size={10} className="inline mr-1" />}
                             {r}
                           </button>
                         ))}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === 'categories' ? (
        <section className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-3xl font-serif font-bold text-brand-primary">Menu Taxonomy</h2>
              <p className="text-text-muted">Organize your products into accessible categories.</p>
            </div>
            <button 
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-brand-primary/10 hover:bg-brand-secondary transition-all"
            >
              <Plus size={20} />
              New Category
            </button>
          </div>

          <div className="bg-white dark:bg-bg-sidebar/50 rounded-[32px] coffee-shadow border border-border-subtle overflow-hidden transition-colors">
            <table className="w-full border-collapse font-sans">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-sidebar/10">
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Category name</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Linked Products</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {categoryList.map((cat) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={cat.id} 
                    className="hover:bg-bg-sidebar/30 transition-all group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/5 flex items-center justify-center text-brand-primary border border-brand-primary/10">
                          <Package size={18} />
                        </div>
                        <span className="font-bold text-brand-primary text-lg">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="bg-bg-sidebar px-4 py-2 rounded-xl text-xs font-bold text-text-muted border border-border-subtle/50">
                        {cat._count?.products || 0} Products
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-2 text-text-muted">
                        <button 
                          onClick={() => {
                            setEditingCategory(cat);
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-2 hover:bg-bg-sidebar hover:text-brand-primary rounded-xl transition-all"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            if(confirm(`Are you sure you want to delete "${cat.name}"?`)) {
                              handleDeleteCategory(cat.id);
                            }
                          }}
                          disabled={(cat._count?.products || 0) > 0}
                          className={`p-2 rounded-xl transition-all ${
                            (cat._count?.products || 0) > 0 
                              ? 'opacity-20 cursor-not-allowed' 
                              : 'hover:bg-red-50 hover:text-brand-danger'
                          }`}
                          title={(cat._count?.products || 0) > 0 ? "Cannot delete: Associated products exist" : "Delete Category"}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === 'variations' ? (
        <section className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-3xl font-serif font-bold text-brand-primary">Customization Groups</h2>
              <p className="text-text-muted">Manage milk types, sweetness, and other drink variations.</p>
            </div>
            <button 
              onClick={() => setIsCustomizationModalOpen(true)}
              className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-brand-primary/10 hover:bg-brand-secondary transition-all"
            >
              <Plus size={20} />
              New Group
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
            {customizations.map((group) => (
              <motion.div 
                key={group.id}
                layout
                className="bg-white border border-border-subtle rounded-[32px] p-8 coffee-shadow space-y-6"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-brand-primary">{group.name}</h3>
                      {group.required && (
                        <span className="bg-brand-secondary/10 text-brand-secondary px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Required</span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted font-bold flex items-center gap-2">
                      <LinkIcon size={12} />
                      Linked to {group.products.length} products
                    </p>
                  </div>
                  <div className="flex gap-2">
                     <button className="p-2 hover:bg-bg-sidebar rounded-xl text-text-muted hover:text-brand-primary transition-all">
                       <Edit3 size={18} />
                     </button>
                     <button 
                      onClick={async () => {
                        if(confirm('Delete this group and all its choices?')) {
                          await apiClient.delete(`/admin/customizations/group/${group.id}`);
                          fetchData();
                        }
                      }}
                      className="p-2 hover:bg-red-50 rounded-xl text-text-muted hover:text-brand-danger transition-all"
                    >
                       <Trash2 size={18} />
                     </button>
                  </div>
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted border-b border-border-subtle pb-2">Choices</p>
                   <div className="grid grid-cols-1 gap-2">
                      {group.choices.map((choice: any) => (
                        <div key={choice.id} className="flex justify-between items-center bg-bg-sidebar/50 p-3 rounded-xl border border-border-subtle/30 group">
                           <div className="flex items-center gap-3">
                              <span className="font-bold text-sm text-brand-primary">{choice.name}</span>
                              {choice.priceModifier !== 0 && (
                                <span className="text-[10px] text-brand-secondary font-bold">
                                  {choice.priceModifier > 0 ? '+' : ''}₱{choice.priceModifier.toFixed(0)}
                                </span>
                              )}
                           </div>
                           <button 
                            onClick={async () => {
                              await apiClient.delete(`/admin/customizations/choice/${choice.id}`);
                              fetchData();
                            }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 rounded-lg text-brand-danger"
                          >
                             <Trash2 size={14} />
                           </button>
                        </div>
                      ))}
                      <NewChoiceButton groupId={group.id} onSuccess={fetchData} />
                   </div>
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Associated Products</p>
                   <div className="flex flex-wrap gap-2">
                      {group.products.map((p: any) => (
                        <span key={p.productId} className="bg-white border border-border-subtle px-3 py-1.5 rounded-xl text-xs font-medium text-brand-primary flex items-center gap-2">
                           {p.product.name}
                        </span>
                      ))}
                      <button className="w-8 h-8 rounded-lg border border-dashed border-border-subtle flex items-center justify-center text-text-muted hover:border-brand-primary hover:text-brand-primary transition-all">
                        <Plus size={14} />
                      </button>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ) : activeTab === 'audit-logs' ? (
        <section className="space-y-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-serif font-bold text-brand-primary">Security Audit Logs</h2>
            <p className="text-text-muted">Track administrative actions and role transitions.</p>
          </div>

          <div className="bg-white dark:bg-bg-sidebar/50 rounded-[32px] coffee-shadow border border-border-subtle overflow-hidden transition-colors">
            <table className="w-full border-collapse font-sans text-left">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-sidebar/10">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Timestamp</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Administrator</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Action</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Target User</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 text-sm">
                {auditLogs.map((log) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={log.id} 
                    className="hover:bg-bg-sidebar/30 transition-all font-sans"
                  >
                    <td className="px-10 py-6 font-mono text-xs text-text-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-10 py-6 font-bold text-brand-primary">
                      {log.adminName}
                    </td>
                    <td className="px-10 py-6">
                      <span className="bg-brand-primary/5 text-brand-primary px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest border border-brand-primary/10">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-10 py-6 font-medium">
                      {log.targetName}
                    </td>
                    <td className="px-10 py-6">
                      <div className="font-bold text-[10px] text-text-muted uppercase tracking-widest whitespace-nowrap">
                        {log.action === 'ROLE_CHANGE' ? (
                          <div className="flex items-center gap-2">
                             <span className="opacity-60">{log.details.oldRole}</span>
                             <ArrowRight size={12} className="text-brand-secondary" />
                             <span className="text-brand-primary">{log.details.newRole}</span>
                          </div>
                        ) : log.action === 'STOCK_UPDATE' ? (
                          <div className="flex items-center gap-2">
                             <span className="opacity-60">{log.details.oldLevel}</span>
                             <ArrowRight size={12} className="text-brand-secondary" />
                             <span className="text-brand-primary">{log.details.newLevel}</span>
                             <span className="ml-1 opacity-40 lowercase">({inventory.find(i => i.id === log.targetId)?.unit})</span>
                          </div>
                        ) : log.action === 'PRICE_UPDATE' ? (
                          <div className="flex items-center gap-2">
                             <span className="opacity-60">₱{log.details.oldPrice}</span>
                             <ArrowRight size={12} className="text-brand-secondary" />
                             <span className="text-brand-primary">₱{log.details.newPrice}</span>
                          </div>
                        ) : (
                          <span className="opacity-60 italic">Administrative Action Recorded</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && (
              <div className="p-20 flex flex-col items-center justify-center opacity-40">
                <Shield size={48} className="mb-4" />
                <p className="font-bold">No security events recorded yet.</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-bg-sidebar/30 rounded-[40px] border border-dashed border-border-subtle overflow-hidden">
          <Coffee size={48} className="text-brand-primary/20 mb-4 animate-bounce" />
          <p className="font-serif text-xl text-brand-primary opacity-40">Ready to brew some data.</p>
        </div>
      )}

      {/* Bottom Sticky Alert (optional, but keep for extra visibility if user likes it) */}
      {lowStockItems.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 bg-brand-danger text-white p-6 rounded-[32px] flex items-center gap-6 font-bold shadow-2xl z-50 border border-white/20"
        >
          <div className="p-2 bg-white/20 rounded-xl">
             <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs opacity-80 uppercase tracking-widest">Inventory Warning</p>
            <p className="text-lg">Critical Stock: {lowStockItems.map(i => i.name).join(', ')}</p>
          </div>
        </motion.div>
      )}

      {/* Create Product Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateProductModal 
            onClose={() => setIsCreateModalOpen(false)} 
            categories={categories}
            inventory={inventory}
            onSuccess={() => {
              setIsCreateModalOpen(false);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInventoryModalOpen && (
          <CreateInventoryModal 
            onClose={() => setIsInventoryModalOpen(false)} 
            onSuccess={() => {
              setIsInventoryModalOpen(false);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <CreateCategoryModal 
            category={editingCategory}
            onClose={() => setIsCategoryModalOpen(false)} 
            onSuccess={() => {
              setIsCategoryModalOpen(false);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomizationModalOpen && (
          <CreateCustomizationModal 
            products={allProducts}
            onClose={() => setIsCustomizationModalOpen(false)} 
            onSuccess={() => {
              setIsCustomizationModalOpen(false);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const NewChoiceButton: React.FC<{ groupId: string; onSuccess: () => void }> = ({ groupId, onSuccess }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [priceModifier, setPriceModifier] = useState(0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await apiClient.post('/admin/customizations/choice', { groupId, name, priceModifier });
      setName('');
      setPriceModifier(0);
      setIsAdding(false);
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAdding) {
    return (
      <button 
        onClick={() => setIsAdding(true)}
        className="w-full py-2 border border-dashed border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center gap-2"
      >
        <Plus size={12} />
        Add Choice
      </button>
    );
  }

  return (
    <form onSubmit={handleAdd} className="p-4 bg-bg-base border border-border-subtle rounded-xl space-y-3 shadow-inner">
      <input 
        autoFocus
        placeholder="Choice name..."
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full p-2 text-sm bg-white border border-border-subtle rounded-lg outline-none focus:border-brand-secondary"
      />
      <div className="flex gap-2 items-center">
        <span className="text-[10px] font-black text-text-muted uppercase tracking-tighter">Price +</span>
        <input 
          type="number"
          value={priceModifier}
          onChange={e => setPriceModifier(Number(e.target.value))}
          className="w-full p-2 text-sm bg-white border border-border-subtle rounded-lg outline-none focus:border-brand-secondary"
        />
      </div>
      <div className="flex gap-2">
         <button type="submit" className="flex-1 py-2 bg-brand-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Add</button>
         <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-bg-sidebar rounded-lg text-[10px] font-bold uppercase tracking-widest text-text-muted">Cancel</button>
      </div>
    </form>
  );
};

const CreateCustomizationModal: React.FC<{ 
  products: Product[];
  onClose: () => void; 
  onSuccess: () => void;
}> = ({ products, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    required: false,
    productIds: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/admin/customizations/group', formData);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProduct = (pid: string) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(pid) 
        ? prev.productIds.filter(id => id !== pid)
        : [...prev.productIds, pid]
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-primary/20 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-border-subtle flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-serif font-bold text-brand-primary">New Variation Group</h2>
            <p className="text-sm text-text-muted font-medium">Define options and link them to products.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-bg-sidebar rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
               <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Group Title</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium"
                    placeholder="e.g. Milk Options"
                  />
               </div>
               <div className="flex items-center gap-4 bg-bg-sidebar/50 p-4 rounded-2xl border border-border-subtle/30">
                  <div 
                    onClick={() => setFormData({...formData, required: !formData.required})}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${formData.required ? 'bg-brand-primary' : 'bg-border-subtle'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.required ? 'left-7' : 'left-1'}`}></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-primary">Mandatory Choice</p>
                    <p className="text-[10px] text-text-muted italic">User must select at least one option.</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1 flex items-center gap-2">
                 <LinkIcon size={12} />
                 Impacted Products
               </label>
               <div className="bg-bg-sidebar rounded-2xl p-4 border border-border-subtle/50 h-56 overflow-y-auto space-y-2 custom-scrollbar">
                  {products.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${formData.productIds.includes(p.id) ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white border-border-subtle hover:border-brand-secondary'}`}
                    >
                       <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.productIds.includes(p.id) ? 'bg-white text-brand-primary border-white' : 'border-border-subtle'}`}>
                          {formData.productIds.includes(p.id) && <Check size={10} />}
                       </div>
                       <span className="text-xs font-bold leading-none">{p.name}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="bg-brand-secondary/5 p-6 rounded-3xl border border-brand-secondary/10 flex items-start gap-4">
             <div className="p-2 bg-brand-secondary text-white rounded-xl shadow-lg">
                <Info size={20} />
             </div>
             <p className="text-xs text-brand-primary font-medium leading-relaxed">
               Choices are added after the group is created. You can manage them directly from the variation card in the dashboard.
             </p>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-muted hover:text-brand-primary transition-all"
            >
              Back to Menu
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <Coffee size={20} className="animate-spin" /> : <Settings2 size={20} />}
              <span>{submitting ? 'Architecting...' : 'Establish Group'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const CreateInventoryModal: React.FC<{ 
  onClose: () => void; 
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    unit: 'pcs',
    stockLevel: 0,
    lowStockThreshold: 5
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/inventory', {
        ...formData,
        stockLevel: Number(formData.stockLevel),
        lowStockThreshold: Number(formData.lowStockThreshold)
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create inventory item:', err);
      alert('Failed to create inventory item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-primary/20 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-border-subtle flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-serif font-bold text-brand-primary">New Resource</h2>
            <p className="text-sm text-text-muted font-medium">Add a new item to the supply chain.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-bg-sidebar rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Resource Name</label>
            <input 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium"
              placeholder="e.g. Arabica Beans"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Initial Stock</label>
              <input 
                required
                type="number"
                value={formData.stockLevel}
                onChange={e => setFormData({...formData, stockLevel: Number(e.target.value)})}
                className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Unit</label>
              <select 
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
                className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium appearance-none"
              >
                <option value="kg">kilograms (kg)</option>
                <option value="L">liters (L)</option>
                <option value="pcs">pieces (pcs)</option>
                <option value="g">grams (g)</option>
                <option value="ml">milliliters (ml)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Low Stock Threshold</label>
            <input 
              required
              type="number"
              value={formData.lowStockThreshold}
              onChange={e => setFormData({...formData, lowStockThreshold: Number(e.target.value)})}
              className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium font-sans"
            />
            <p className="mt-2 text-[10px] text-text-muted italic px-1">We'll alert you when stock drops below this level.</p>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-muted hover:text-brand-primary transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <Coffee size={20} className="animate-spin" /> : <Plus size={20} />}
              <span>{submitting ? 'Adding...' : 'Add to Inventory'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const CreateProductModal: React.FC<{ 
  onClose: () => void; 
  categories: Category[]; 
  inventory: InventoryItem[];
  onSuccess: () => void;
}> = ({ onClose, categories, inventory, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    categoryId: categories[0]?.id || '',
    ingredients: [] as { inventoryItemId: string; quantityNeeded: number }[]
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      // Use raw fetch for FormData because apiClient might be configured for JSON
      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const addIngredient = () => {
    if (inventory.length === 0) return;
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { inventoryItemId: inventory[0].id, quantityNeeded: 1 }]
    }));
  };

  const removeIngredient = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx)
    }));
  };

  const updateIngredient = (idx: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      alert('Please upload an image or provide a URL.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/menu', {
        ...formData,
        price: Number(formData.price)
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create product:', err);
      alert('Failed to create product. Check if fields are valid.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-primary/20 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
      >
        <div className="p-8 border-b border-border-subtle flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-serif font-bold text-brand-primary">New Masterpiece</h2>
            <p className="text-sm text-text-muted">Introduce a new item to the Parking Latte menu.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-bg-sidebar rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Image Upload Area */}
          <div className="relative group">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
            />
            {formData.imageUrl ? (
              <div className="relative w-full h-48 rounded-3xl overflow-hidden border border-border-subtle group">
                <img 
                  src={formData.imageUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                   <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/30 transition-all"
                   >
                     <ImagePlus size={16} />
                     Change Image
                   </button>
                </div>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-48 border-2 border-dashed border-border-subtle rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:bg-bg-sidebar hover:border-brand-primary group ${uploading ? 'animate-pulse' : ''}`}
              >
                <div className="w-16 h-16 bg-bg-sidebar rounded-2xl flex items-center justify-center text-text-muted group-hover:text-brand-primary transition-all">
                  {uploading ? <Coffee size={32} className="animate-spin" /> : <Upload size={32} />}
                </div>
                <div className="text-center">
                  <p className="font-bold text-brand-primary">Upload Product Image</p>
                  <p className="text-xs text-text-muted">PNG, JPG or WebP (Max 5MB)</p>
                </div>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Product Name</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium"
                  placeholder="e.g. Lavender Honey Latte"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Price (₱)</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium font-sans"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Category</label>
                <select 
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium appearance-none"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Or Image URL</label>
                <input 
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Description</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium resize-none"
              rows={3}
              placeholder="Tell a story about this drink..."
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black uppercase tracking-widest text-text-muted ml-1">Ingredient Blueprint</label>
              <button 
                type="button" 
                onClick={addIngredient}
                className="text-[10px] font-black uppercase tracking-widest text-brand-secondary hover:text-brand-primary flex items-center gap-1 transition-colors"
              >
                <Plus size={12} /> Add Ingredient
              </button>
            </div>
            <div className="space-y-3">
              {formData.ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-bg-sidebar p-3 rounded-2xl border border-border-subtle/50">
                  <select 
                    value={ing.inventoryItemId}
                    onChange={e => updateIngredient(idx, 'inventoryItemId', e.target.value)}
                    className="flex-1 bg-transparent outline-none font-bold text-sm"
                  >
                    {inventory.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      step="0.1"
                      value={ing.quantityNeeded}
                      onChange={e => updateIngredient(idx, 'quantityNeeded', Number(e.target.value))}
                      className="w-16 bg-white border border-border-subtle rounded-lg px-2 py-1 text-center font-bold text-xs"
                    />
                    <span className="text-[10px] font-bold text-text-muted uppercase">Qty</span>
                  </div>
                  <button type="button" onClick={() => removeIngredient(idx)} className="text-brand-danger p-1 hover:bg-white rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ))}
              {formData.ingredients.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-border-subtle rounded-3xl opacity-40">
                  <p className="text-xs font-medium">No ingredients assigned yet.</p>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-border-subtle bg-bg-sidebar/30">
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-8 py-4 text-sm font-bold text-text-muted hover:text-brand-primary transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <Coffee size={20} className="animate-spin" /> : <Plus size={20} />}
              <span>{submitting ? 'Brewing...' : 'Create Product'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="bg-white p-10 rounded-[32px] coffee-shadow border border-border-subtle flex flex-col items-center text-center">
    <div className="p-4 bg-bg-sidebar rounded-2xl mb-6">
      {icon}
    </div>
    <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-2">{label}</p>
    <p className="text-3xl font-serif font-bold text-brand-primary">{value}</p>
  </div>
);

const RoleBadge = ({ role }: { role: Role }) => {
  const styles = {
    ADMIN: 'bg-brand-primary text-white',
    STAFF: 'bg-brand-secondary text-white',
    CUSTOMER: 'bg-bg-sidebar text-text-muted border border-border-subtle'
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${styles[role]}`}>
      {role}
    </span>
  );
};

const CreateCategoryModal: React.FC<{ 
  category?: Category | null;
  onClose: () => void; 
  onSuccess: () => void;
}> = ({ category, onClose, onSuccess }) => {
  const [name, setName] = useState(category?.name || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (category) {
        await apiClient.put(`/menu/categories/${category.id}`, { name });
      } else {
        await apiClient.post('/menu/categories', { name });
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-primary/20 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-border-subtle flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-serif font-bold text-brand-primary">{category ? 'Refine Category' : 'New Collection'}</h2>
            <p className="text-sm text-text-muted font-medium">Define a new segment for your menu.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-bg-sidebar rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-text-muted mb-2 ml-1">Category Name</label>
            <input 
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-4 bg-bg-sidebar border border-border-subtle rounded-2xl focus:border-brand-secondary outline-none transition-all font-medium"
              placeholder="e.g. Signature Lattes"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-muted hover:text-brand-primary transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <Coffee size={20} className="animate-spin" /> : <Package size={20} />}
              <span>{submitting ? 'Setting up...' : (category ? 'Update Category' : 'Establish Category')}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
