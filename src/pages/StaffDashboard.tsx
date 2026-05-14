import React from 'react';
import { useAuth } from '../context/AuthContext';
import GlobalOrderFeed from '../components/GlobalOrderFeed';

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Access check
  if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-12 bg-white rounded-[40px] border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500 font-medium">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-1 sm:p-4 lg:p-10 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-brand-primary mb-2">Kitchen Queue</h1>
          <p className="text-slate-500 font-medium italic lowercase tracking-wide">Maintain the flow, one cup at a time.</p>
        </div>
        <div className="px-5 py-2 bg-brand-primary/10 rounded-2xl border border-brand-primary/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Live Connection Active</span>
        </div>
      </div>
      
      <GlobalOrderFeed role={user.role as 'ADMIN' | 'STAFF'} filterActive={true} />
    </div>
  );
};

export default StaffDashboard;
