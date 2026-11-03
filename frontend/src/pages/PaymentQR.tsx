import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { paymentApi } from "@/lib/api";
import acledaLogo from "@/assets/acleda-logo.png";

interface PaymentQrData {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  gatewayRef?: string | null;
  course?: { id: string; title: string } | null;
  imageUrl: string;
  payload?: string;
  bankName?: string;
}

export function PaymentQR() {
  const { courseId, paymentId } = useParams<{ courseId: string; paymentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initial = (location.state || {}) as Partial<PaymentQrData> & {
    courseTitle?: string;
  };

  const [data, setData] = useState<PaymentQrData | null>(
    initial.imageUrl
      ? {
          paymentId: paymentId || "",
          amount: Number(initial.amount || 0),
          currency: initial.currency || "USD",
          status: "pending",
          gatewayRef: initial.gatewayRef,
          course: initial.courseTitle ? { id: courseId || "", title: initial.courseTitle } : undefined,
          imageUrl: initial.imageUrl,
          bankName: initial.bankName || "ACLEDA KHQR",
        }
      : null
  );
  const [loading, setLoading] = useState(!initial.imageUrl);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [confirming, setConfirming] = useState(false);

  const loadQr = async () => {
    if (!paymentId) return;
    try {
      const res = await paymentApi.getPaymentQr(paymentId);
      setData(res.data.data);
      setError(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Could not load the ACLEDA QR code";
      setError((prev) => prev ?? message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQr();
  }, [paymentId]);

  const isTerminal =
    data?.status === "completed" ||
    data?.status === "failed" ||
    data?.status === "refunded";
  const isExpired = secondsLeft <= 0 && !isTerminal;

  useEffect(() => {
    if (!paymentId || isTerminal || isExpired) return;
    const interval = setInterval(loadQr, 5000);
    return () => clearInterval(interval);
  }, [paymentId, isTerminal, isExpired]);

  useEffect(() => {
    if (isTerminal) return;
    const timer = setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTerminal]);

  const handleSandboxConfirm = async () => {
    if (!paymentId || confirming) return;
    setConfirming(true);
    try {
      await paymentApi.confirmPayment(paymentId, {
        status: "completed",
        gatewayRef: `SANDBOX-WEB-${Date.now()}`,
      });
      toast.success("Payment confirmed");
      await loadQr();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not confirm payment");
    } finally {
      setConfirming(false);
    }
  };

  const copyReference = async () => {
    if (!data?.gatewayRef) return;
    try {
      await navigator.clipboard.writeText(data.gatewayRef);
      setCopied(true);
      toast.success("Reference copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the reference");
    }
  };

  const backToCheckout = () => {
    if (courseId) navigate(`/checkout/${courseId}`);
    else navigate(-1);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={backToCheckout}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to checkout
      </button>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : error && !data ? (
        <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-600" />
          <h2 className="mt-3 text-lg font-bold text-amber-900 dark:text-amber-100">
            QR code unavailable
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-amber-800 dark:text-amber-200">{error}</p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setLoading(true);
                loadQr();
              }}
              className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
            <button
              type="button"
              onClick={backToCheckout}
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to checkout
            </button>
          </div>
        </div>
      ) : data ? (
        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-5 py-5 text-white sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#163865] px-3 py-1 shadow-sm ring-1 ring-white/10">
                  <img src={acledaLogo} alt="ACLEDA Bank" className="h-5 w-5 object-contain" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-white">
                    {data.bankName || "ACLEDA KHQR"}
                  </span>
                </div>
                <h1 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">Scan to Pay</h1>
                <p className="mt-1 text-xs text-slate-300">{data.course?.title || "Course payment"}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black sm:text-3xl">
                  ${Number(data.amount || 0).toFixed(2)}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {data.currency || "USD"}
                </div>
              </div>
            </div>
          </div>

          {data.status === "completed" ? (
            <div className="space-y-4 p-6 text-center sm:p-8">
              <CheckCircle className="mx-auto h-16 w-16 animate-bounce text-emerald-600" />
              <div>
                <h2 className="text-xl font-black text-emerald-950 dark:text-emerald-100 sm:text-2xl">
                  Payment Confirmed!
                </h2>
                <p className="mx-auto mt-1 max-w-md text-xs text-emerald-800 dark:text-emerald-300">
                  Your payment has been verified and course access is now active.
                </p>
              </div>
              <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(`/courses/${courseId}`)}
                  className="btn-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm font-bold sm:w-auto"
                >
                  Start Learning Now
                </button>
                <Link
                  to={`/payments/${data.paymentId}/invoice`}
                  className="btn-secondary inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-xs font-semibold sm:w-auto"
                >
                  <FileText className="h-4 w-4 text-emerald-600" />
                  View Invoice
                </Link>
              </div>
            </div>
          ) : data.status === "failed" || data.status === "refunded" ? (
            <div className="space-y-4 p-6 text-center sm:p-8">
              <AlertCircle className="mx-auto h-14 w-14 text-rose-500" />
              <h2 className="text-xl font-black capitalize text-rose-700 dark:text-rose-300">
                Payment {data.status}
              </h2>
              <p className="mx-auto max-w-md text-xs text-slate-500">
                This payment can no longer be completed. Please start a new checkout if you still want to enroll.
              </p>
              <button
                type="button"
                onClick={backToCheckout}
                className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to checkout
              </button>
            </div>
          ) : isExpired ? (
            <div className="space-y-4 p-6 text-center sm:p-8">
              <AlertCircle className="mx-auto h-14 w-14 text-amber-500" />
              <h2 className="text-xl font-black text-amber-700 dark:text-amber-300">
                QR session expired
              </h2>
              <p className="mx-auto max-w-md text-xs text-slate-500">
                For your security this QR is no longer valid. Generate a new payment to continue.
              </p>
              <button
                type="button"
                onClick={backToCheckout}
                className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold"
              >
                <RefreshCw className="h-4 w-4" />
                Generate new QR
              </button>
            </div>
          ) : (
            <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)] md:items-start">
              {/* Full QR image */}
              <div className="mx-auto w-full max-w-[380px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700">
                <img
                  src={data.imageUrl}
                  alt={`${data.bankName || "ACLEDA"} payment QR code`}
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>

              {/* Details & instructions */}
              <div className="space-y-4">
                <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Course</span>
                    <span className="text-right font-semibold text-slate-800 dark:text-slate-200">
                      {data.course?.title || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Amount</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      ${Number(data.amount || 0).toFixed(2)} {data.currency || "USD"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Reference</span>
                    <span className="flex items-center gap-1.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {data.gatewayRef || "—"}
                      {data.gatewayRef && (
                        <button
                          type="button"
                          onClick={copyReference}
                          className="rounded p-0.5 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                          aria-label="Copy reference"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Status</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-500" />
                      Waiting for payment · {Math.floor(secondsLeft / 60)}:
                      {String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    <ShieldCheck className="h-4 w-4" />
                    How to pay
                  </h3>
                  <ol className="list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-200">
                    <li>Open ACLEDA Mobile, Bakong, ABA, or any KHQR banking app.</li>
                    <li>Scan the QR code shown here — the amount is already filled in.</li>
                    <li>Confirm the payment. This page updates automatically once confirmed.</li>
                  </ol>
                </div>

                {(import.meta.env.DEV ||
                  import.meta.env.VITE_ALLOW_SANDBOX_CONFIRM === "true") && (
                  <button
                    type="button"
                    onClick={handleSandboxConfirm}
                    disabled={confirming}
                    className="btn-primary inline-flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-semibold"
                  >
                    {confirming ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    {confirming ? "Confirming..." : "I've paid / Simulate sandbox payment"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={loadQr}
                  className="btn-secondary inline-flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-semibold"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Check payment status
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
