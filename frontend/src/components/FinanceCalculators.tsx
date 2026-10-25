import React, { useState } from "react";
import {
  Calculator,
  ArrowRightLeft,
  Info,
} from "lucide-react";

export const FinanceCalculators: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [activeTab, setActiveTab] = useState<"loan" | "compound" | "budget" | "converter" | "glossary">("loan");

  // ─── 1. Loan / EMI Calculator ───
  const [loanPrincipal, setLoanPrincipal] = useState<number>(5000);
  const [loanInterestRate, setLoanInterestRate] = useState<number>(10); // annual %
  const [loanTermMonths, setLoanTermMonths] = useState<number>(24);

  const calculateLoan = () => {
    const p = Number(loanPrincipal) || 0;
    const r = (Number(loanInterestRate) || 0) / 100 / 12; // monthly rate
    const n = Number(loanTermMonths) || 1;

    if (r === 0) {
      const emi = p / n;
      return { emi, totalPayment: p, totalInterest: 0 };
    }

    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - p;

    return { emi, totalPayment, totalInterest };
  };

  const loanResults = calculateLoan();

  // ─── 2. Compound Interest Calculator ───
  const [ciPrincipal, setCiPrincipal] = useState<number>(1000);
  const [ciMonthlyContribution, setCiMonthlyContribution] = useState<number>(100);
  const [ciRate, setCiRate] = useState<number>(8); // annual %
  const [ciYears, setCiYears] = useState<number>(5);

  const calculateCompoundInterest = () => {
    const P = Number(ciPrincipal) || 0;
    const PMT = Number(ciMonthlyContribution) || 0;
    const r = (Number(ciRate) || 0) / 100;
    const n = 12; // compounded monthly
    const t = Number(ciYears) || 1;

    const futureValuePrincipal = P * Math.pow(1 + r / n, n * t);
    const futureValueContributions = PMT * ((Math.pow(1 + r / n, n * t) - 1) / (r / n));
    const totalBalance = futureValuePrincipal + (r > 0 ? futureValueContributions : PMT * n * t);
    const totalDeposited = P + PMT * n * t;
    const totalInterestEarned = Math.max(0, totalBalance - totalDeposited);

    return { totalBalance, totalDeposited, totalInterestEarned };
  };

  const ciResults = calculateCompoundInterest();

  // ─── 3. 50/30/20 Monthly Budget Planner ───
  const [monthlyIncome, setMonthlyIncome] = useState<number>(600);
  const [incomeCurrency, setIncomeCurrency] = useState<"USD" | "KHR">("USD");

  const needsBudget = (monthlyIncome * 0.5);
  const wantsBudget = (monthlyIncome * 0.3);
  const savingsBudget = (monthlyIncome * 0.2);

  // ─── 4. USD ↔ KHR Live Currency Converter ───
  const NBC_EXCHANGE_RATE = 4100; // 4,100 KHR per 1 USD (Standard National Bank of Cambodia benchmark)
  const [convAmount, setConvAmount] = useState<number>(100);
  const [convDirection, setConvDirection] = useState<"USD_TO_KHR" | "KHR_TO_USD">("USD_TO_KHR");

  const convertedValue =
    convDirection === "USD_TO_KHR"
      ? convAmount * NBC_EXCHANGE_RATE
      : convAmount / NBC_EXCHANGE_RATE;

  // ─── 5. Cambodia Fintech & Payment Glossary ───
  const [glossarySearch, setGlossarySearch] = useState("");
  const glossaryItems = [
    {
      term: "KHQR",
      khmer: "ខេអេចឃ្យូអរ",
      category: "Payments",
      definition:
        "The universal cross-bank QR code standard established by the National Bank of Cambodia (NBC). Allows any Cambodian mobile banking app (ABA, Wing, ACLEDA, Bakong) to scan and pay seamlessly.",
    },
    {
      term: "Bakong",
      khmer: "បាគង",
      category: "Central Bank Tech",
      definition:
        "Cambodia's state-of-the-art peer-to-peer payment and interbank transaction system developed by the NBC, powered by hyperledger blockchain technology.",
    },
    {
      term: "NBC (National Bank of Cambodia)",
      khmer: "ធនាគារជាតិនៃកម្ពុជា",
      category: "Regulation",
      definition:
        "The central monetary authority and banking supervisor of the Kingdom of Cambodia, responsible for the stability of the Khmer Riel (KHR) and payment system rails.",
    },
    {
      term: "EMI (Equated Monthly Installment)",
      khmer: "ការបង់រំលស់ប្រចាំខែ",
      category: "Lending",
      definition:
        "A fixed monthly repayment amount paid by a borrower to a financial institution, consisting of both principal and interest components until the loan is fully amortized.",
    },
    {
      term: "Compound Interest",
      khmer: "ការប្រាក់ទ្វេ",
      category: "Investment",
      definition:
        "Interest earned on the initial principal plus accumulated interest from previous periods. Often hailed as 'interest on interest', accelerating long-term wealth.",
    },
    {
      term: "50/30/20 Rule",
      khmer: "ក្បួនថវិកា ៥០/៣០/២០",
      category: "Financial Planning",
      definition:
        "A widely recommended personal finance allocation framework: 50% of after-tax income for Needs (food, rent, utilities), 30% for Wants (dining, hobbies), and 20% for Savings and debt repayment.",
    },
    {
      term: "Microfinance Institution (MFI)",
      khmer: "គ្រឹះស្ថានមីក្រូហិរញ្ញវត្ថុ",
      category: "Banking",
      definition:
        "Licensed financial entities in Cambodia providing micro-loans and financial services, especially supporting agricultural rural entrepreneurs and small merchants.",
    },
    {
      term: "CBC (Credit Bureau Cambodia)",
      khmer: "ការិយាល័យឥណទានកម្ពុជា",
      category: "Credit",
      definition:
        "The official credit reporting agency in Cambodia that collects consumer borrowing histories to assess creditworthiness and default risks for commercial lenders.",
    },
  ];

  const filteredGlossary = glossaryItems.filter(
    (item) =>
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.definition.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.khmer.includes(glossarySearch)
  );

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${compact ? "p-4" : "p-6"}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Cambodian Fintech & Financial Tools
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Practical calculators and literacy references tailored for Cambodian finance education.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("loan")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              activeTab === "loan"
                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Loan / EMI
          </button>
          <button
            onClick={() => setActiveTab("compound")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              activeTab === "compound"
                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Compound Growth
          </button>
          <button
            onClick={() => setActiveTab("budget")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              activeTab === "budget"
                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            50/30/20 Budget
          </button>
          <button
            onClick={() => setActiveTab("converter")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              activeTab === "converter"
                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            USD ↔ KHR
          </button>
          <button
            onClick={() => setActiveTab("glossary")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              activeTab === "glossary"
                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Glossary
          </button>
        </div>
      </div>

      {/* Tab 1: Loan EMI Calculator */}
      {activeTab === "loan" && (
        <div className="pt-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loan Amount ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={loanPrincipal}
                  onChange={(e) => setLoanPrincipal(Number(e.target.value))}
                  className="input pl-8 py-2 text-sm w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Annual Interest Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max="40"
                  value={loanInterestRate}
                  onChange={(e) => setLoanInterestRate(Number(e.target.value))}
                  className="input pr-8 py-2 text-sm w-full"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loan Duration (Months)
              </label>
              <select
                value={loanTermMonths}
                onChange={(e) => setLoanTermMonths(Number(e.target.value))}
                className="input py-2 text-sm w-full"
              >
                <option value={6}>6 Months (Half year)</option>
                <option value={12}>12 Months (1 Year)</option>
                <option value={24}>24 Months (2 Years)</option>
                <option value={36}>36 Months (3 Years)</option>
                <option value={60}>60 Months (5 Years)</option>
                <option value={120}>120 Months (10 Years)</option>
              </select>
            </div>
          </div>

          {/* Result Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
            <div className="text-center sm:text-left">
              <span className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">Monthly EMI</span>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                ${loanResults.emi.toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-500">
                ≈ {(loanResults.emi * NBC_EXCHANGE_RATE).toLocaleString()} ៛/mo
              </span>
            </div>

            <div className="text-center sm:text-left">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total Interest Paid</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                ${loanResults.totalInterest.toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-500">
                Cost of borrowing
              </span>
            </div>

            <div className="text-center sm:text-left">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total Loan Repayment</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                ${loanResults.totalPayment.toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-500">
                Principal + Interest
              </span>
            </div>
          </div>

          {/* Visual Amortization Proportion Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
              <span>Principal: ${loanPrincipal.toLocaleString()} ({Math.round((loanPrincipal / loanResults.totalPayment) * 100)}%)</span>
              <span>Interest: ${Math.round(loanResults.totalInterest).toLocaleString()} ({Math.round((loanResults.totalInterest / loanResults.totalPayment) * 100)}%)</span>
            </div>
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${(loanPrincipal / loanResults.totalPayment) * 100}%` }}
                title="Principal"
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${(loanResults.totalInterest / loanResults.totalPayment) * 100}%` }}
                title="Total Interest"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Compound Growth Calculator */}
      {activeTab === "compound" && (
        <div className="pt-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Initial Investment ($)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={ciPrincipal}
                onChange={(e) => setCiPrincipal(Number(e.target.value))}
                className="input py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Monthly Contribution ($)
              </label>
              <input
                type="number"
                min="0"
                step="20"
                value={ciMonthlyContribution}
                onChange={(e) => setCiMonthlyContribution(Number(e.target.value))}
                className="input py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Expected Annual Return (%)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                step="0.5"
                value={ciRate}
                onChange={(e) => setCiRate(Number(e.target.value))}
                className="input py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Time Horizon (Years)
              </label>
              <input
                type="number"
                min="1"
                max="40"
                value={ciYears}
                onChange={(e) => setCiYears(Number(e.target.value))}
                className="input py-2 text-sm w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <div>
              <span className="text-xs text-indigo-800 dark:text-indigo-400 font-medium">Future Portfolio Value</span>
              <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5">
                ${Math.round(ciResults.totalBalance).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500">
                After {ciYears} years of compound growth
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total Cash Invested</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                ${Math.round(ciResults.totalDeposited).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500">Principal + monthly deposits</span>
            </div>
            <div>
              <span className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">Compound Interest Earned</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                +${Math.round(ciResults.totalInterestEarned).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500">Free earnings from interest</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 50/30/20 Monthly Budget Planner */}
      {activeTab === "budget" && (
        <div className="pt-5 space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Monthly Net Income
              </label>
              <input
                type="number"
                min="50"
                step="50"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="input py-2 text-sm w-full"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={incomeCurrency}
                onChange={(e) => setIncomeCurrency(e.target.value as "USD" | "KHR")}
                className="input py-2 text-sm w-full"
              >
                <option value="USD">USD ($)</option>
                <option value="KHR">KHR (៛)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 50% Needs */}
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Needs (50%)
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Essential</span>
              </div>
              <p className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 mt-2">
                {incomeCurrency === "USD" ? `$${needsBudget.toFixed(2)}` : `${needsBudget.toLocaleString()} ៛`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Housing, utilities, groceries, transportation, insurance, and minimum loan obligations.
              </p>
            </div>

            {/* 30% Wants */}
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  Wants (30%)
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">Lifestyle</span>
              </div>
              <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 mt-2">
                {incomeCurrency === "USD" ? `$${wantsBudget.toFixed(2)}` : `${wantsBudget.toLocaleString()} ៛`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Dining out, entertainment, vacations, shopping, streaming subscriptions, and leisure.
              </p>
            </div>

            {/* 20% Savings */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  Savings (20%)
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Future</span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-2">
                {incomeCurrency === "USD" ? `$${savingsBudget.toFixed(2)}` : `${savingsBudget.toLocaleString()} ៛`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Emergency fund, debt acceleration, retirement savings, stocks, and business capital.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: USD ↔ KHR Live Currency Converter */}
      {activeTab === "converter" && (
        <div className="pt-5 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount ({convDirection === "USD_TO_KHR" ? "USD $" : "KHR ៛"})
              </label>
              <input
                type="number"
                min="1"
                value={convAmount}
                onChange={(e) => setConvAmount(Number(e.target.value))}
                className="input py-2.5 text-base font-semibold w-full"
              />
            </div>

            <button
              onClick={() =>
                setConvDirection(convDirection === "USD_TO_KHR" ? "KHR_TO_USD" : "USD_TO_KHR")
              }
              className="btn-secondary mt-5 p-2.5 flex items-center justify-center rounded-lg"
              title="Reverse conversion direction"
            >
              <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
            </button>

            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Converted Equivalent ({convDirection === "USD_TO_KHR" ? "KHR ៛" : "USD $"})
              </label>
              <div className="input py-2.5 text-base font-bold bg-slate-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300">
                {convDirection === "USD_TO_KHR"
                  ? `${Math.round(convertedValue).toLocaleString()} ៛`
                  : `$${convertedValue.toFixed(2)}`}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-500 flex items-center justify-between">
            <span>Benchmark Rate: 1 USD = <strong>{NBC_EXCHANGE_RATE.toLocaleString()} KHR</strong></span>
            <span>Standard National Bank of Cambodia (NBC) parity</span>
          </div>

          {/* Quick Denominations Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Common Cambodian Banknote Equivalents</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 border rounded-lg bg-white dark:bg-slate-800">
                <span className="font-bold">10,000 ៛</span> ≈ ${(10000 / NBC_EXCHANGE_RATE).toFixed(2)}
              </div>
              <div className="p-2 border rounded-lg bg-white dark:bg-slate-800">
                <span className="font-bold">20,000 ៛</span> ≈ ${(20000 / NBC_EXCHANGE_RATE).toFixed(2)}
              </div>
              <div className="p-2 border rounded-lg bg-white dark:bg-slate-800">
                <span className="font-bold">50,000 ៛</span> ≈ ${(50000 / NBC_EXCHANGE_RATE).toFixed(2)}
              </div>
              <div className="p-2 border rounded-lg bg-white dark:bg-slate-800">
                <span className="font-bold">100,000 ៛</span> ≈ ${(100000 / NBC_EXCHANGE_RATE).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Cambodian Fintech Glossary */}
      {activeTab === "glossary" && (
        <div className="pt-5 space-y-4">
          <input
            type="text"
            placeholder="Search financial terms (e.g., KHQR, Bakong, EMI, Compound Interest)..."
            value={glossarySearch}
            onChange={(e) => setGlossarySearch(e.target.value)}
            className="input py-2 text-sm w-full"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {filteredGlossary.map((item) => (
              <div
                key={item.term}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.term}</h4>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">({item.khmer})</span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {item.definition}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mandatory Regulatory & Educational Disclaimer (US requirement) */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-500">
        <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Regulatory Notice:</strong> All calculators, simulations, and financial glossary items provided in ELMS are strictly for educational and instructional simulation purposes under academic guidelines, and do not constitute certified financial or investment advice under NBC regulation.
        </p>
      </div>
    </div>
  );
};
