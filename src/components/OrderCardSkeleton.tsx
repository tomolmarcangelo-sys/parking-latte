import React from 'react';
import SkeletonLoader from './SkeletonLoader';

const OrderCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-border-subtle flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8 relative overflow-hidden">
      <div className="w-full lg:w-auto flex justify-between items-start lg:items-center gap-6">
        <div className="flex gap-4 sm:gap-6 items-center">
          <SkeletonLoader className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl" />
          <div className="space-y-2">
            <SkeletonLoader className="w-24 h-6 rounded-lg" />
            <SkeletonLoader className="w-32 h-4 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="flex-1 lg:px-8 w-full">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <SkeletonLoader className="w-32 h-8 rounded-xl" />
          <SkeletonLoader className="w-24 h-8 rounded-xl" />
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 lg:gap-4 self-end lg:self-center w-full lg:w-auto">
        <SkeletonLoader className="w-20 h-6 rounded-full" />
        <div className="text-right space-y-2">
          <SkeletonLoader className="w-16 h-3 rounded-lg" />
          <SkeletonLoader className="w-24 h-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default OrderCardSkeleton;
