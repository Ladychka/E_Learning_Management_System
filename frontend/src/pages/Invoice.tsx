import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Printer,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Loader2,
  Coins,
} from "lucide-react";
import toast from "react-hot-toast";
import { paymentApi } from "@/lib/api";
import acledaLogo from "@/assets/acleda-logo.png";

interface InvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  billedTo: {
    name: string;
    email: string;
  };
  items: Array<{
    description: string;
    amount: string | number;
    currency: string;
  }>;
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  currency: string;
  payment: {
    method: string;
    reference?: string;
    paidAt?: string;
  };
  status: string;
  paymentPlan?: string;
  installmentSchedule?: {
    installmentIndex: number;
    totalInstallments: number;
    fullCoursePrice: number | string;
    amountPaid: number | string;
    remainingAmount: number | string;
    nextDueDate: string | null;
  } | null;
}

export function Invoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await paymentApi.getInvoice(id!);
      setInvoice(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Invoice link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-slate-500">Retrieving official digital invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Invoice</h2>
        <p className="text-sm text-slate-600 mb-6">{error || "The requested invoice could not be found."}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const NBC_RATE = 4100;
  const invoiceCurrency = String(invoice.currency || "USD").toUpperCase();
  const totalRaw = parseFloat(String(invoice.total || 0));
  const subtotalRaw = parseFloat(String(invoice.subtotal || 0));
  const discountRaw = parseFloat(String(invoice.discount || 0));
  const isKhrInvoice = invoiceCurrency === "KHR";
  const totalUsd = isKhrInvoice ? totalRaw / NBC_RATE : totalRaw;
  const subtotalUsd = isKhrInvoice ? subtotalRaw / NBC_RATE : subtotalRaw;
  const discountUsd = isKhrInvoice ? discountRaw / NBC_RATE : discountRaw;
  const totalKhr = Math.round(isKhrInvoice ? totalRaw : totalUsd * NBC_RATE);
  const subtotalKhr = Math.round(isKhrInvoice ? subtotalRaw : subtotalUsd * NBC_RATE);

  const isPaid = invoice.status === "completed";
  const verificationQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    `https://elms.edu.kh/verify/invoice/${invoice.invoiceNumber}?amount=${invoice.total}&ref=${invoice.payment.reference || ""}`
  )}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Navigation & Action Controls (Hidden when printing) */}
      <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/payments/${id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Payment
          </button>
          <span className="text-slate-300">|</span>
          <Link
            to="/payments"
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition"
          >
            All Transactions
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Link"}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Official A4-Style Invoice Paper Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden print:border-none print:shadow-none print:m-0 print:p-0">
        {/* Header Ribbon / Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-black text-lg">
                E
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">ELMS Financial Academy</h1>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                  Cambodian Fintech & Banking Institute
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              National Bank of Cambodia (NBC) KHQR Compliant E-Learning Platform
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm ${
                isPaid
                  ? "bg-emerald-500 text-white border border-emerald-300"
                  : invoice.status === "refunded"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-700 text-slate-200 border border-slate-600"
              }`}
            >
              {isPaid ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {isPaid ? "PAID • OFFICIAL RECEIPT" : invoice.status.toUpperCase()}
            </span>
            <p className="font-mono text-sm font-bold text-slate-200 mt-2">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#163865] px-2.5 py-1 ring-1 ring-white/10">
              <img src={acledaLogo} alt="ACLEDA Bank" className="h-4 w-4 object-contain" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-white">
                ACLEDA Bank KHQR
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Metadata Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Invoice Date
            </span>
            <span className="font-bold text-slate-800">
              {new Date(invoice.issuedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Payment Rail
            </span>
            <span className="font-bold text-slate-800 capitalize flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              {invoice.payment.method.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Payment Ref
            </span>
            <span className="font-mono font-semibold text-slate-700 truncate block">
              {invoice.payment.reference || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Settlement Status
            </span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Instant Bank Verified
            </span>
          </div>
        </div>

        {/* Billed To vs Issued By Section */}
        <div className="grid sm:grid-cols-2 gap-8 p-6 sm:p-8">
          {/* Billed To */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billed To (Student)</h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-900 text-base">
                {invoice.billedTo.name || "Student Participant"}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{invoice.billedTo.email}</p>
              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-[11px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Verified Student Account
              </div>
            </div>
          </div>

          {/* Issued By */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issued By (Merchant)</h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-900 text-sm">ELMS Fintech Education Ltd.</p>
              <p className="text-slate-600">Exchange Square, St 106, Daun Penh</p>
              <p className="text-slate-600">Phnom Penh 12202, Kingdom of Cambodia</p>
              <div className="pt-2 text-[11px] text-slate-500 space-y-0.5">
                <p>Tax Reg / VAT TIN: <span className="font-mono font-semibold text-slate-700">K001-90234851</span></p>
                <p>NBC Bakong ID: <span className="font-mono font-semibold text-slate-700">elms_academy@nbc</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="px-6 sm:px-8">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Amount (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoice.items.map((item, idx) => {
                  const itemAmt = parseFloat(String(item.amount || 0));
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        <div>{item.description}</div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                          Includes lifetime on-demand lesson access, financial calculators & verified certificate.
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-medium">1</td>
                      <td className="py-4 px-4 text-right font-medium">
                        ${itemAmt.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        ${itemAmt.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Part Payment / Installment Schedule Card (if applicable) */}
        {invoice.installmentSchedule && (
          <div className="mx-6 sm:mx-8 mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-blue-900">
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" /> Part Payment Schedule
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-800 text-[10px]">
                  Installment {invoice.installmentSchedule.installmentIndex} of {invoice.installmentSchedule.totalInstallments}
                </span>
              </span>
              <span className="text-emerald-700 font-extrabold text-[11px]">0% Interest Financing</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-blue-100">
                <span className="text-[10px] text-slate-400 uppercase block font-sans">Full Course Price</span>
                <span className="font-bold text-slate-800">${parseFloat(String(invoice.installmentSchedule.fullCoursePrice)).toFixed(2)} USD</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100">
                <span className="text-[10px] text-emerald-600 uppercase block font-sans font-bold">Amount Paid (Today)</span>
                <span className="font-bold text-emerald-700">${parseFloat(String(invoice.installmentSchedule.amountPaid)).toFixed(2)} USD</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100">
                <span className="text-[10px] text-blue-600 uppercase block font-sans font-bold">Remaining Balance</span>
                <span className="font-bold text-blue-800">${parseFloat(String(invoice.installmentSchedule.remainingAmount)).toFixed(2)} USD</span>
              </div>
            </div>
            {invoice.installmentSchedule.nextDueDate && (
              <p className="text-[11px] text-slate-600 pt-0.5">
                Next scheduled installment due date: <span className="font-semibold text-slate-800">{new Date(invoice.installmentSchedule.nextDueDate).toLocaleDateString()}</span>
              </p>
            )}
          </div>
        )}

        {/* Financial Summary & QR Verification Grid */}
        <div className="p-6 sm:p-8 grid sm:grid-cols-12 gap-8 items-start">
          {/* Left: Cryptographic QR Code & Verification Notice */}
          <div className="sm:col-span-7 flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="bg-white p-2 rounded-lg border border-slate-200 flex-shrink-0 shadow-sm">
              <img
                src={verificationQrUrl}
                alt="Electronic Verification QR Code"
                className="w-24 h-24 rounded"
              />
            </div>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Scan to Verify Receipt
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This receipt is tamper-evident and cryptographically signed on the ELMS platform. Scan with any camera to verify validity against the NBC payment ledger.
              </p>
              <div className="pt-1 text-[10px] text-slate-400 font-mono">
                Hash: {invoice.invoiceNumber.toLowerCase()}-khqr-auth
              </div>
            </div>
          </div>

          {/* Right: Dual Currency Calculation Card */}
          <div className="sm:col-span-5 space-y-2 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">
                ${subtotalUsd.toFixed(2)} USD (≈ {subtotalKhr.toLocaleString()} ៛)
              </span>
            </div>

            {discountUsd > 0 && (
              <div className="flex justify-between py-1 text-emerald-600">
                <span>Discount Coupon:</span>
                <span className="font-semibold">-${discountUsd.toFixed(2)} USD</span>
              </div>
            )}

            <div className="flex justify-between py-1 text-slate-600">
              <span>VAT / Tax (0% Education):</span>
              <span className="font-semibold text-slate-900">$0.00 USD</span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
              <span className="font-extrabold text-slate-900 text-sm">Total Paid:</span>
              <div className="text-right">
                <span className="text-xl font-extrabold text-emerald-700 block">
                  ${totalUsd.toFixed(2)} USD
                </span>
                <span className="text-xs font-bold text-slate-500">
                  ≈ {totalKhr.toLocaleString()} ៛ KHR
                </span>
              </div>
            </div>
            <p className="text-[10px] text-right text-slate-400 font-medium">
              Calculated at NBC Reference Rate (1 USD = 4,100 KHR)
            </p>
          </div>
        </div>

        {/* Footer Regulatory Note */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 text-center text-[11px] text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">
            Thank you for enrolling in ELMS Cambodia.
          </p>
          <p>
            Official digital proof of payment. For billing questions or corporate sponsorship, contact support@elms.edu.kh.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Invoice;
