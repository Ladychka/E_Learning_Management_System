import React from "react";
import { FinanceCalculators } from "../components/FinanceCalculators";
import { Calculator, ShieldCheck } from "lucide-react";

export const FinanceTools: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-600" />
            Fintech Interactive Tools & Calculators
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Empowering Cambodian learners with practical tools for loan amortization, compound interest, personal budgeting, and NBC currency exchange.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          NBC Compliant Reference
        </div>
      </div>

      <FinanceCalculators compact={false} />
    </div>
  );
};
