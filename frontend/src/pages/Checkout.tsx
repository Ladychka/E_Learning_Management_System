import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CreditCard,
  Tag,
  CheckCircle,
  AlertCircle,
  QrCode,
  Smartphone,
  ExternalLink,
  Banknote,
  Clock,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { courseApi, paymentApi } from "@/lib/api";

interface Course {
  id: string;
  title: string;
  thumbnailUrl?: string;
  price?: number;
  currency: string;
  isFree: boolean;
}

type Gateway = "khqr" | "aba_payway" | "bakong";

export function Checkout() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateway, setGateway] = useState<Gateway>("khqr");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<Record<string, any> | null>(null);

  // KHQR Timer & Polling states
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes (300s)
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed" | "failed" | "expired">("pending");

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (courseId) loadCourse();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const res = await courseApi.getCourse(courseId!);
      const c = res.data.data;
      setCourse(c);
      const price = c.isFree ? 0 : Number(c.price || 0);
      setOriginalPrice(price);
      setFinalPrice(price);
    } catch {
      toast.error("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await paymentApi.validateCoupon(couponCode, courseId);
      const data = res.data.data;
      if (data.discountType === "percentage") {
        const disc = Number((originalPrice * Number(data.discountValue) / 100).toFixed(2));
        setDiscount(disc);
        setFinalPrice(Number((originalPrice - disc).toFixed(2)));
      } else {
        const disc = Number(data.discountValue);
        setDiscount(disc);
        setFinalPrice(Math.max(0, originalPrice - disc));
      }
      toast.success("Coupon applied");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid coupon");
    }
  };

  const startPolling = (paymentId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await paymentApi.getPayment(paymentId);
        const current = res.data.data;
        if (current.status === "completed") {
          setPaymentStatus("completed");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          toast.success("Payment confirmed! Enrolled successfully.");
        } else if (current.status === "failed") {
          setPaymentStatus("failed");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch {
        // quiet poll
      }
    }, 3000); // Check every 3 seconds
  };

  const startCountdown = () => {
    setTimeLeft(300);
    setIsExpired(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsExpired(true);
          setPaymentStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCheckout = async () => {
    if (!courseId) return;
    try {
      setProcessing(true);
      const res = await paymentApi.checkout({
        courseId,
        gateway,
        couponCode: couponCode || undefined,
      });
      const data = res.data.data;
      setCheckoutResult(data);

      if (data.status === "completed") {
        setPaymentStatus("completed");
        toast.success("Enrolled successfully!");
      } else {
        setPaymentStatus("pending");
        startCountdown();
        startPolling(data.payment.id);
        toast.success("QR Code generated. Please scan to complete.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Checkout failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleManualConfirm = async () => {
    const paymentId = checkoutResult?.payment?.id;
    if (!paymentId) return;
    try {
      setIsVerifying(true);
      const res = await paymentApi.confirmPayment(paymentId, { status: "completed" });
      if (res.data.data?.status === "completed") {
        setPaymentStatus("completed");
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        toast.success("Payment verified and enrollment activated!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const getGatewayIcon = (g: Gateway) => {
    switch (g) {
      case "khqr":
        return <QrCode className="w-5 h-5" />;
      case "aba_payway":
        return <CreditCard className="w-5 h-5" />;
      case "bakong":
        return <Smartphone className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Course not found.</p>
      </div>
    );
  }

  const isFree = course.isFree || originalPrice === 0;

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Secure Fintech Checkout</h1>
              <p className="text-xs text-slate-500 mt-0.5">Instant enrollment via National Bank of Cambodia KHQR rails</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Encrypted
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Course Summary Card */}
          <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="w-20 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0 overflow-hidden">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <CreditCard className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{course.title}</h2>
              <div className="mt-1">
                {isFree ? (
                  <span className="text-emerald-600 font-bold text-sm">Free Course</span>
                ) : (
                  <div className="flex items-baseline gap-2">
                    {discount > 0 && (
                      <span className="text-slate-400 line-through text-xs">
                        ${originalPrice} {course.currency}
                      </span>
                    )}
                    <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      ${finalPrice} {course.currency}
                    </span>
                    <span className="text-xs text-slate-500">
                      (≈ {(finalPrice * 4100).toLocaleString()} ៛ KHR)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form when checkout NOT initiated */}
          {!isFree && !checkoutResult && (
            <>
              {/* Payment Gateway Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Cambodian Payment Rail
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["khqr", "aba_payway", "bakong"] as Gateway[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGateway(g)}
                      className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border transition text-xs font-semibold ${
                        gateway === g
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {getGatewayIcon(g)}
                      <span className="capitalize">{g.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coupon Code Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Discount Coupon
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. WELCOME20"
                      className="input pl-9 text-sm uppercase font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="btn-secondary px-4 text-xs font-semibold"
                  >
                    Apply
                  </button>
                </div>
                {discount > 0 && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1.5">
                    ✓ Discount applied: -${discount} {course.currency}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Active Payment Screen (QR, Polling, Manual Confirm, or Success) */}
          {checkoutResult ? (
            <div className="text-center space-y-4 py-2">
              {paymentStatus === "completed" ? (
                <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <CheckCircle className="w-14 h-14 text-emerald-600 mx-auto animate-bounce" />
                  <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                    Payment Successfully Completed!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 max-w-sm mx-auto">
                    Your enrollment has been activated. You now have full lifetime access to all lessons, quizzes, and certificates.
                  </p>
                  <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="btn-primary mt-2 inline-flex items-center gap-2"
                  >
                    Start Learning Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : isExpired ? (
                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                  <Clock className="w-12 h-12 text-amber-600 mx-auto" />
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    Payment QR Expired
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    The 5-minute session for this KHQR transaction has ended to protect transaction security.
                  </p>
                  <button
                    onClick={() => {
                      setCheckoutResult(null);
                      setIsExpired(false);
                      setTimeLeft(300);
                    }}
                    className="btn-primary inline-flex items-center gap-1.5 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Generate New QR Code
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Countdown Timer Banner */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
                      Session Expires In:
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {formatTimer(timeLeft)}
                    </span>
                  </div>

                  {/* QR Image Display */}
                  {checkoutResult.checkout?.qrImage ? (
                    <div className="relative inline-block p-4 bg-white rounded-2xl border-2 border-dashed border-emerald-300 shadow-md">
                      <img
                        src={checkoutResult.checkout.qrImage}
                        alt="KHQR Scan to Pay"
                        className="w-52 h-52 mx-auto rounded-lg"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        Live Polling
                      </div>
                    </div>
                  ) : checkoutResult.checkout?.paymentUrl ? (
                    <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                      <a
                        href={checkoutResult.checkout.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <Banknote className="w-4 h-4" /> Open ABA Bank Checkout <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ) : null}

                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Scan with any Bakong-enabled Cambodian banking app (ABA, Wing, ACLEDA, Sathapana). The system will automatically detect completion.
                  </p>

                  {/* Manual Confirmation Button (Sandbox Verification) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <button
                      onClick={handleManualConfirm}
                      disabled={isVerifying}
                      className="btn-secondary w-full py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      {isVerifying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                      I've Paid / Simulate Sandbox Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutResult(null);
                        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      Change Payment Method
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Initiate Checkout Button */
            <button
              onClick={handleCheckout}
              disabled={processing}
              className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating KHQR Rails...
                </>
              ) : isFree ? (
                "Enroll Instantly for Free"
              ) : (
                <>
                  Pay ${finalPrice} {course.currency} via {gateway.toUpperCase().replace("_", " ")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
