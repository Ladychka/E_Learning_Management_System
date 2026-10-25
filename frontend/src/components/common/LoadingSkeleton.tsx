import React from "react";

export const CourseGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
        >
          <div className="h-44 bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-4 space-y-3">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-none">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm animate-pulse">
      <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
      <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
    </div>
  );
};
