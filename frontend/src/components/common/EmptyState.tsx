import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  actionLink,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-4 shadow-xs">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && actionLink && (
        <Link
          to={actionLink}
          className="btn-primary inline-flex items-center gap-2 text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-sm"
        >
          {actionText}
        </Link>
      )}
      {actionText && onAction && !actionLink && (
        <button
          onClick={onAction}
          className="btn-primary inline-flex items-center gap-2 text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
