import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Receipt, CreditCard, CheckCircle, Clock, ArrowLeft,
  Download, Banknote
} from "lucide-react";
import { paymentApi } from "@/lib/api";

interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  gateway: string;
  gatewayRef?: string;
  couponCode?: string;
  discountAmount?: string;
  paidAt?: string;
  createdAt: string;
  course?: { id: string; title: string; thumbnailUrl?: string };
  user?: { firstName: string; lastName: string; email: string };
  metadata?: Record<string, any>;
}

export function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadPayment();
  }, [id]);

  const loadPayment = async () => {
    try {
      setLoading(true);
      const res = await paymentApi.getPayment(id!);
      setPayment(res.data.data);
    } catch {
      toast.error("Failed to load payment");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: "bg-green-100 text-green-700 border-green-200",
      failed: "bg-red-100 text-red-700 border-red-200",
      refunded: "bg-orange-100 text-orange-700 border-orange-200",
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    };
    return map[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Payment not found.</p>
        <Link to="/payments" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Payment History
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link
        to="/payments"
        className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600 mb-6"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Payment History
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Payment #{payment.id.slice(0, 8)}</p>
              <h1 className="text-xl font-bold mt-1">Payment Details</h1>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusBadge(payment.status)}`}>
              {payment.status === "completed" && <CheckCircle className="w-4 h-4 inline mr-1" />}
              {payment.status === "pending" && <Clock className="w-4 h-4 inline mr-1" />}
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Course info */}
        {payment.course && (
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">Course</h2>
            <Link
              to={`/courses/${payment.course.id}`}
              className="flex items-center gap-3 group"
            >
              <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {payment.course.thumbnailUrl ? (
                  <img src={payment.course.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Receipt className="w-full h-full p-3 text-gray-300" />
                )}
              </div>
              <span className="font-medium text-primary-600 group-hover:underline">
                {payment.course.title}
              </span>
            </Link>
          </div>
        )}

        {/* Amount */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">Amount</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {payment.amount} {payment.currency}
            </span>
          </div>
          {payment.discountAmount && Number(payment.discountAmount) > 0 && (
            <p className="text-sm text-green-600 mt-1">
              Discount applied: -{payment.discountAmount} {payment.currency}
              {payment.couponCode && ` (Code: ${payment.couponCode})`}
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">Payment Method & Plan</h2>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-500" />
            <span className="font-semibold capitalize text-gray-900">
              {payment.gateway.replace("_", " ")}
            </span>
            {(payment.metadata as any)?.paymentPlan === "installment" && (
              <span className="ml-2 text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                Part Payment (Installment {(payment.metadata as any)?.installmentIndex || 1} of {(payment.metadata as any)?.totalInstallments || 2})
              </span>
            )}
          </div>
          {payment.gatewayRef && (
            <p className="text-sm text-gray-500 mt-1">
              Reference: {payment.gatewayRef}
            </p>
          )}
          {(payment.metadata as any)?.paymentPlan === "installment" && Number((payment.metadata as any)?.remainingAmount || 0) > 0 && (
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Remaining Balance: ${(payment.metadata as any).remainingAmount} USD (Due in 30 days • 0% Interest)
            </p>
          )}
        </div>

        {/* Dates */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">Dates</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Created</span>
              <span>{new Date(payment.createdAt).toLocaleString()}</span>
            </div>
            {payment.paidAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Paid</span>
                <span>{new Date(payment.paidAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 flex gap-3">
          <Link
            to={`/payments/${id}/invoice`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            <Download className="w-4 h-4" />
            View Invoice
          </Link>
          {payment.course && (
            <Link
              to={`/courses/${payment.course.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <Banknote className="w-4 h-4" />
              Go to Course
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
