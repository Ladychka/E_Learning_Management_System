import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CreditCard, Tag, CheckCircle, AlertCircle, QrCode, Smartphone, ExternalLink, Banknote, Clock } from "lucide-react";
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
  const [checkoutResult, setCheckoutResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (courseId) loadCourse();
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
        setDiscount(Number((originalPrice * Number(data.discountValue) / 100).toFixed(2)));
        setFinalPrice(Number((originalPrice - (originalPrice * Number(data.discountValue) / 100)).toFixed(2)));
      } else {
        setDiscount(Number(data.discountValue));
        setFinalPrice(Math.max(0, originalPrice - Number(data.discountValue)));
      }
      toast.success("Coupon applied");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid coupon");
    }
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
      setCheckoutResult(res.data.data);
      toast.success("Checkout initiated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Checkout failed");
    } finally {
      setProcessing(false);
    }
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
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
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold mb-1">Checkout</h1>
          <p className="text-gray-500">Complete your purchase to get full access.</p>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-20 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              )}
            </div>
            <div>
              <h2 className="font-semibold">{course.title}</h2>
              <div className="mt-1">
                {isFree ? (
                  <span className="text-green-600 font-medium">Free</span>
                ) : (
                  <div className="flex items-baseline gap-2">
                    {discount > 0 && (
                      <span className="text-gray-400 line-through">
                        {originalPrice} {course.currency}
                      </span>
                    )}
                    <span className="text-xl font-bold">
                      {finalPrice} {course.currency}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isFree && !checkoutResult && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["khqr", "aba_payway", "bakong"] as Gateway[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGateway(g)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition text-sm ${
                        gateway === g
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {getGatewayIcon(g)}
                      <span className="capitalize">{g.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter code"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>
                  <button
                    onClick={applyCoupon}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    Apply
                  </button>
                </div>
                {discount > 0 && (
                  <p className="text-sm text-green-600 mt-1">Discount applied: -{discount} {course.currency}</p>
                )}
              </div>
            </>
          )}

          {checkoutResult ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">Payment Initiated</h3>
              <p className="text-gray-600 mb-4">
                {checkoutResult.status === "completed"
                  ? "You now have full access to this course."
                  : "Please complete the payment using the details below."}
              </p>

              {(() => {
                const checkout = (checkoutResult.checkout || {}) as Record<string, string>;
                return (
                  <>
                    {checkout.qrData && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Scan QR code to pay:</p>
                        <img
                          src={checkout.qrImage || ""}
                          alt="Payment QR"
                          className="mx-auto w-48 h-48 border border-gray-200 rounded-lg"
                        />
                      </div>
                    )}
                    {checkout.paymentUrl && (
                      <div className="mb-4">
                        <a
                          href={checkout.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold shadow-md"
                        >
                          <Banknote className="w-5 h-5" />
                          Pay via ABA Bank
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {checkout.note && (
                          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p>{checkout.note}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              <button
                onClick={() => navigate(`/courses/${courseId}`)}
                className="block mx-auto text-blue-600 hover:underline"
              >
                Go to Course
              </button>
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={processing}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </span>
              ) : isFree ? (
                "Enroll for Free"
              ) : (
                `Pay ${finalPrice} ${course.currency}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
