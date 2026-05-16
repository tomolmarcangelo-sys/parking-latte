import React from 'react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';

interface ProductDemandChartProps {
  stats: any;
  loading: boolean;
}

export const ProductDemandChart: React.FC<ProductDemandChartProps> = React.memo(({ stats, loading }) => {
  if (loading) {
    return (
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all">
        <div className="flex items-center gap-3 mb-10">
          <SkeletonLoader className="w-6 h-6 rounded-full" />
          <SkeletonLoader className="w-48 h-8" />
        </div>
        <SkeletonLoader className="w-full h-72" />
      </section>
    );
  }

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all">
      <h2 className="text-2xl font-serif font-bold text-[#1A1F2E] mb-10 flex items-center gap-3">
        <BarChart3 size={24} className="text-[#1A1F2E]" />
        Product Demand
      </h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats?.topProducts || []}>
            <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
            <YAxis hide />
            <Tooltip 
              cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', 
                padding: '12px',
                backgroundColor: 'white',
                color: '#1A1F2E'
              }}
              itemStyle={{ color: '#1A1F2E' }}
              labelStyle={{ color: '#64748B', fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Bar dataKey="quantity" fill="#1A1F2E" radius={[4, 4, 0, 0]} barSize={40}>
              {stats?.topProducts?.map((_entry:any, index:number) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#1A1F2E' : '#64748B'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});

ProductDemandChart.displayName = 'ProductDemandChart';
