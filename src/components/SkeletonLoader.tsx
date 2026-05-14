import React from 'react';

const SkeletonLoader = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`}></div>
);

export const CartItemSkeleton = () => (
  <div className="flex gap-4 p-4 border-b border-gray-100">
    <SkeletonLoader className="w-16 h-16" />
    <div className="flex-1 space-y-2">
      <SkeletonLoader className="w-3/4 h-4" />
      <SkeletonLoader className="w-1/2 h-3" />
      <SkeletonLoader className="w-1/4 h-4" />
    </div>
  </div>
);

export default SkeletonLoader;
