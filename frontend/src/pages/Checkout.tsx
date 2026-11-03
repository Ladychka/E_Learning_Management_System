import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CreditCard,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Calendar,
  Split,
  Sparkles,
  Lock,
  CheckCircle,
} from "lucide-react";
import { courseApi, paymentApi, enrollmentApi } from "@/lib/api";

interface Course {
  id: string;
  title: string;
  thumbnailUrl?: string;
  price?: number;
  currency: string;
  isFree: boolean;
}

export type Gateway = "acleda";
export type PaymentPlan = "full" | "installment";

const NBC_EXCHANGE_RATE = 4100;

export function Checkout() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("full");
  const [installmentParts, setInstallmentParts] = useState<number>(2); // 2 or 3 parts
  const [finalPrice, setFinalPrice] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (courseId) loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const res = await courseApi.getCourse(courseId!);
      const c = res.data.data;
      setCourse(c);
      const isFreeCourse = Boolean(c.isFree) || Number(c.price || 0) === 0;
      if (isFreeCourse) {
        try {
          await enrollmentApi.selfEnroll(c.id || courseId!);
          toast.success("Free course enrolled successfully!");
        } catch {
          // let navigation proceed
        }
        navigate(`/courses/${c.id || courseId}`);
        return;
      }
      setFinalPrice(Number(c.price || 0));
    } catch {
      toast.error("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!courseId || processing) return;
    setProcessing(true);
    try {
      const res = await paymentApi.checkout({
        courseId,
        gateway: "acleda",
        paymentPlan,
        ...(paymentPlan === "installment" ? { installments: installmentParts } : {}),
        currency: "USD",
      });
      const data = res.data.data;

      if (data.payment?.status === "completed" || data.checkout?.status === "completed") {
        toast.success("Enrolled successfully!");
        navigate(`/courses/${courseId}`);
        return;
      }

      if (!data?.checkout?.qrImage) {
        toast.error(
          data?.checkout?.note ||
            "No ACLEDA QR code matches this exact amount. Please pay the full course price in USD."
        );
        return;
      }

      navigate(`/checkout/${courseId}/qr/${data.payment.id}`, {
        state: {
          imageUrl: data.checkout.qrImage,
          bankName: data.checkout.bankName,
          note: data.checkout.note,
          amount: Number(data.payment.amount),
          currency: data.payment.currency,
          gatewayRef: data.payment.gatewayRef,
          courseTitle: course?.title,
        },
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Checkout failed");
    } finally {
      setProcessing(false);
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

  const isFree = course.isFree || finalPrice === 0;

  // Payments are always charged in USD. Convert KHR-priced courses once for
  // display and installment math so the same numbers are used everywhere.
  const isKhrCourse = String(course.currency || "USD").toUpperCase() === "KHR";
  const priceUsd = isKhrCourse ? finalPrice / NBC_EXCHANGE_RATE : finalPrice;
  const finalPriceKhr = Math.round(
    isKhrCourse ? finalPrice : finalPrice * NBC_EXCHANGE_RATE
  );

  // Installment calculations
  const installmentAmountUsd = Number((priceUsd / installmentParts).toFixed(2));
  const remainingAmountUsd = Number((priceUsd - installmentAmountUsd).toFixed(2));

  // Current amount due today based on selected plan
  const dueTodayUsd = paymentPlan === "installment" ? installmentAmountUsd : priceUsd;
  const dueTodayKhr = Math.round(dueTodayUsd * NBC_EXCHANGE_RATE);

  return (
    <div className="-mx-4 -mt-4 pb-8 lg:-mx-8 lg:-mt-8">
      {/* Full-width hero banner */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                Official Bank KHQR
              </span>
              <span className="text-xs text-slate-300">NBC Exchange: 1 USD = 4,100 KHR</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Fintech Course Checkout</h1>
            <p className="max-w-2xl text-sm text-slate-300">Secure ACLEDA KHQR checkout</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/30 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-300 sm:self-auto">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>256-Bit SSL</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Main column: payment plan only */}
          <div className="min-w-0 space-y-6">
            {!isFree && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <section className="p-5 sm:p-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      <Split className="h-3.5 w-3.5 text-emerald-600" />
                      Select Payment Plan
                    </label>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      0% Interest Financing
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Option A: Full Payment */}
                    <div
                      onClick={() => setPaymentPlan("full")}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                        paymentPlan === "full"
                          ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 dark:bg-emerald-950/30"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                          <CreditCard className="h-4 w-4 text-emerald-600" />
                          Pay in Full (100%)
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          Single Pay
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                          ${priceUsd.toFixed(2)} USD
                        </div>
                        <div className="text-xs text-slate-500">
                          ≈ {finalPriceKhr.toLocaleString()} ៛ KHR
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                        Instant lifetime access to all lessons, quizzes, and public QR certificate.
                      </p>
                    </div>

                    {/* Option B: Part Payment / Installment */}
                    <div
                      onClick={() => setPaymentPlan("installment")}
                      className={`relative cursor-pointer rounded-2xl border p-4 transition-all ${
                        paymentPlan === "installment"
                          ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 dark:bg-blue-950/30"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    >
                      <div className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                        <Sparkles className="h-2.5 w-2.5" />
                        Popular for Students
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                          <Split className="h-4 w-4 text-blue-600" />
                          Part Payment ({installmentParts} Parts)
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-lg font-black text-blue-700 dark:text-blue-300">
                          ${installmentAmountUsd.toFixed(2)} USD{" "}
                          <span className="text-xs font-normal text-slate-500">today</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          ≈ {Math.round(installmentAmountUsd * NBC_EXCHANGE_RATE).toLocaleString()} ៛ KHR
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                        Pay ${installmentAmountUsd.toFixed(2)} now to unlock course immediately.{" "}
                        {installmentParts === 2
                          ? `Part 2 (${remainingAmountUsd.toFixed(2)}) is due in 30 days.`
                          : `The remaining ${remainingAmountUsd.toFixed(2)} is split across ${installmentParts - 1} monthly payments.`}
                      </p>
                    </div>
                  </div>

                  {/* Sub-toggle for Installments (2 vs 3 parts) */}
                  {paymentPlan === "installment" && (
                    <div className="mt-3 space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs dark:border-blue-900 dark:bg-blue-950/20">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-200">
                          <Calendar className="h-3.5 w-3.5 text-blue-600" />
                          Installment Structure:
                        </span>
                        <div className="flex items-center gap-1 rounded-lg border border-blue-200 bg-white p-0.5 dark:border-blue-800 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => setInstallmentParts(2)}
                            className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                              installmentParts === 2
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            2 Parts (50% / 50%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setInstallmentParts(3)}
                            className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                              installmentParts === 3
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            3 Parts (33.3% / mo)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-1 font-mono text-[11px] sm:grid-cols-2">
                        <div className="flex flex-col rounded-lg border border-blue-100 bg-white p-2 dark:border-blue-900 dark:bg-slate-800">
                          <span className="text-[10px] font-bold uppercase text-blue-600">Part 1 (Today)</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            ${installmentAmountUsd.toFixed(2)} (≈ {Math.round(installmentAmountUsd * NBC_EXCHANGE_RATE).toLocaleString()} ៛)
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                            <CheckCircle className="h-3 w-3" /> Unlocks Full Access
                          </span>
                        </div>
                        <div className="flex flex-col rounded-lg border border-blue-100 bg-white p-2 dark:border-blue-900 dark:bg-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Remaining Balance</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            ${remainingAmountUsd.toFixed(2)} (≈ {Math.round(remainingAmountUsd * NBC_EXCHANGE_RATE).toLocaleString()} ៛)
                          </span>
                          <span className="mt-0.5 text-[9px] font-medium text-slate-500">Due in 30 days (0% fee)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* Sidebar / Order Summary */}
          <aside className="space-y-4 lg:sticky lg:top-4">
            {/* Course Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-200 shadow-inner dark:bg-slate-700">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <CreditCard className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Accredited Curriculum
                  </span>
                  <h2 className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {course.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    {isFree ? (
                      <span className="text-sm font-bold text-emerald-600">Free Course</span>
                    ) : (
                      <>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                          ${priceUsd.toFixed(2)} USD
                        </span>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          (≈ {finalPriceKhr.toLocaleString()} ៛ KHR)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary Breakdown */}
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Course Original Price</span>
                <span className="font-mono">${priceUsd.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Payment Plan</span>
                <span className="text-right font-semibold text-slate-800 dark:text-slate-200">
                  {paymentPlan === "installment"
                    ? `Part Payment (${installmentParts} Parts • 0% Interest)`
                    : "Full Payment (100%)"}
                </span>
              </div>
              {paymentPlan === "installment" && (
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Remaining Balance (Due in 30 Days)</span>
                  <span className="font-mono">${remainingAmountUsd.toFixed(2)} USD</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                <span className="text-sm">Total Due Today</span>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                    ${dueTodayUsd.toFixed(2)} USD
                  </span>
                  <span className="block text-[11px] font-medium text-slate-500">
                    ≈ {dueTodayKhr.toLocaleString()} ៛ KHR
                  </span>
                </div>
              </div>

              {/* Pay Button */}
              {!isFree && (
                <button
                  onClick={handlePay}
                  disabled={processing}
                  className="btn-primary mt-3 flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold shadow-lg transition hover:shadow-xl"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing ACLEDA QR...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Pay ${dueTodayUsd.toFixed(2)} USD via ACLEDA KHQR
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}

              <p className="pt-1 text-center text-[10px] font-medium text-slate-400">
                You will be taken to a dedicated page with the ACLEDA QR code.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
