import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { courseApi, enrollmentApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  BookOpen, Clock, Users, ArrowLeft, Play, FileText,
  HelpCircle, CreditCard, LogIn, CheckCircle, Loader2,
  Award, Star, ShieldCheck, ChevronDown, ChevronUp,
  GraduationCap, Sparkles, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

export const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!id) return;
    courseApi
      .getCourse(id)
      .then((res) => setCourse(res.data.data))
      .catch(() => toast.error("Failed to load course"))
      .finally(() => setLoading(false));
  }, [id]);

  // Check enrollment status
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    enrollmentApi
      .getMyEnrollments()
      .then((res) => {
        const enrollments = res.data.data || [];
        const targetId = course?.id || id;
        const enrolled = enrollments.some(
          (e: any) =>
            (e.courseId === targetId || e.courseId === id || e.course?.slug === id) &&
            e.status === "active"
        );
        setIsEnrolled(enrolled);
      })
      .catch(() => {
        // silently fail — buttons will just show as not enrolled
      });
  }, [isAuthenticated, id, course]);

  const handleEnroll = async () => {
    const targetId = course?.id || id;
    if (!targetId) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setEnrolling(true);
    try {
      await enrollmentApi.selfEnroll(targetId);
      setIsEnrolled(true);
      toast.success("Enrolled successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  const handleBuy = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const isFreeCourse = Boolean(course?.isFree) || parseFloat(course?.price || "0") === 0;
    if (isFreeCourse) {
      handleEnroll();
      return;
    }
    navigate(`/checkout/${course?.id || id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return <div className="py-16 text-center text-gray-500 font-medium">Course not found.</div>;
  }

  // Cambodian Riel exchange rate conversion: 4,100 KHR / 1 USD
  const priceUsd = parseFloat(course.price || "0");
  const priceKhr = Math.round(priceUsd * 4100).toLocaleString();
  const isFreeCourse = Boolean(course.isFree) || priceUsd === 0;

  // FAQs
  const faqs = [
    {
      q: "Do I receive a verifiable certificate upon completion?",
      a: "Yes! Once all required lessons, quizzes (min 70% passing grade), and assignments are graded, an immutable certificate with a unique verification QR code is generated instantly.",
    },
    {
      q: "Can I pay using Cambodian banking rails (KHQR, ABA, Wing, ACLEDA)?",
      a: "Absolutely. Our checkout natively supports Bakong KHQR dynamic codes for all Cambodian commercial banks (ABA, ACLEDA, Wing, Canadia, etc.) as well as direct card checkout in both USD and KHR.",
    },
    {
      q: "Can I pay in parts / installments?",
      a: "Yes! We offer a 0% interest Part Payment plan. You can pay 50% upfront to unlock full course access immediately, with the remaining balance scheduled in 30 days.",
    },
    {
      q: "Are the interactive financial calculators included?",
      a: "Yes. Every enrolled student has unlimited access to our built-in Loan/EMI Amortization, Compound Growth, 50/30/20 Budgeting, and NBC Currency tools.",
    },
    {
      q: "How long do I have access to the learning materials?",
      a: "You get lifetime on-demand access to all course videos, slides, spreadsheet models, and future curriculum updates.",
    },
  ];

  // Learning outcomes fallback
  const outcomes = Array.isArray(course.learningOutcomes) && course.learningOutcomes.length > 0
    ? course.learningOutcomes
    : [
        "Master Cambodian modern banking rails and KHQR payment architecture",
        "Analyze microfinance credit risks and Credit Bureau of Cambodia (CBC) scoring",
        "Implement risk management strategies aligned with NBC prudential regulations",
        "Calculate EMI amortization schedules and compound interest portfolios",
        "Build digital financial product workflows compliant with AML/CFT standards"
      ];

  const prerequisites = Array.isArray(course.prerequisites) && course.prerequisites.length > 0
    ? course.prerequisites
    : ["Basic understanding of banking concepts", "High school mathematics or familiarity with spreadsheets", "Interest in Southeast Asian fintech growth"];

  return (
    <div className="space-y-8 pb-24">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link to="/courses" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-emerald-600 transition">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to all courses
        </Link>
        <span className="text-xs text-gray-400 font-mono">ID: {course.id.slice(0, 8)}</span>
      </div>

      {/* Hero Banner Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-12 gap-0">
          {/* Main Info */}
          <div className="p-6 sm:p-8 lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                  {course.level || "ALL LEVELS"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {course.category?.name || "FinTech & Banking"}
                </span>
                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.9 (128 reviews)
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
                {course.title}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                {course.shortDesc || course.description}
              </p>

              {/* Stats badges */}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-gray-500 border-y border-gray-100 py-3">
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  {course.duration || 120} min of training
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-emerald-600" />
                  {course._count?.enrollments || 42} students enrolled
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  {course.modules?.length || 0} modules
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Award className="h-4 w-4 text-emerald-600" />
                  Verifiable Certificate
                </div>
              </div>

              {/* Instructor snippet */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-base font-bold text-white shadow-sm">
                  {course.instructor?.firstName?.[0] || "I"}
                  {course.instructor?.lastName?.[0] || "N"}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {course.instructor?.firstName} {course.instructor?.lastName}
                  </p>
                  <p className="text-xs text-emerald-700 font-medium">Senior Financial Application Specialist & Lecturer</p>
                </div>
              </div>
            </div>

            {/* Top Enrollment / Pricing Row */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              {isEnrolled ? (
                <button
                  onClick={() => {
                    const firstLessonId = course.modules?.[0]?.lessons?.[0]?.id;
                    if (firstLessonId) {
                      navigate(`/lessons/${firstLessonId}`);
                    } else {
                      toast.error("No lessons published yet");
                    }
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white hover:bg-emerald-700 transition shadow-sm"
                >
                  <CheckCircle className="h-5 w-5" />
                  You're Enrolled — Start Learning
                </button>
              ) : isFreeCourse ? (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <GraduationCap className="h-5 w-5" />
                      Enroll Free Today
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-gray-900">${priceUsd.toFixed(2)}</span>
                      <span className="text-xs font-semibold uppercase text-gray-500">USD</span>
                    </div>
                    <p className="text-xs text-emerald-700 font-medium">
                      ≈ {priceKhr} KHR (KHQR Bakong, ABA, Wing, ACLEDA)
                    </p>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
                      <span>🪙 Or pay in 2 parts:</span>
                      <span className="font-bold">${(priceUsd / 2).toFixed(2)}/month (0% interest)</span>
                    </div>
                  </div>
                  <div className="flex-1 sm:max-w-xs">
                    {!isAuthenticated ? (
                      <button
                        onClick={() => navigate("/login")}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 font-bold text-white hover:bg-slate-800 transition shadow-sm"
                      >
                        <LogIn className="h-4 w-4" />
                        Log in to Purchase
                      </button>
                    ) : (
                      <button
                        onClick={handleBuy}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white hover:bg-emerald-700 transition shadow-sm"
                      >
                        <CreditCard className="h-4 w-4" />
                        Buy with KHQR / Card
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Visual Column */}
          <div className="lg:col-span-5 bg-slate-900 p-6 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/60 to-slate-900" />
            <div className="relative z-10 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-slate-800">
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-full h-52 object-cover"
                />
              ) : (
                <div className="h-52 flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                  <BookOpen className="h-16 w-16 text-emerald-400 mb-2" />
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-300">Financial Course Syllabus</span>
                </div>
              )}
              <div className="p-4 bg-slate-900 text-white">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Features included:</p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> Full HD Lessons + Audio Stream</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> Interactive Financial Calculators</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> Quizzes, Rubrics & Discussion Forum</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> Cryptographic QR Verified Certificate</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Content Outline vs Outcomes/Instructor */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Syllabus & Content Breakdown */}
        <div className="lg:col-span-8 space-y-8">
          {/* Learning Outcomes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              What You Will Learn
            </h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {outcomes.map((item: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Course Curriculum Modules */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Curriculum Syllabus</h2>
                <p className="text-xs text-gray-500">Explore modules, video topics, and practical assessments</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
                {course.modules?.length || 0} Modules Total
              </span>
            </div>

            <div className="space-y-3">
              {course.modules?.length ? (
                course.modules.map((mod: any, mIdx: number) => (
                  <div key={mod.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                          {mIdx + 1}
                        </span>
                        <h3 className="font-semibold text-gray-900 text-sm">{mod.title}</h3>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {mod.lessons?.length || 0} lessons
                      </span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {mod.lessons?.map((lesson: any) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            {lesson.contentType === "video" && <Play className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                            {lesson.contentType === "pdf" && <FileText className="h-4 w-4 text-rose-500 flex-shrink-0" />}
                            {lesson.contentType === "quiz" && <HelpCircle className="h-4 w-4 text-purple-500 flex-shrink-0" />}
                            {lesson.contentType === "text" && <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                            <span className="font-medium text-gray-800 text-sm">{lesson.title}</span>
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">
                              {lesson.contentType}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {lesson.duration && (
                              <span className="text-xs text-gray-400">{lesson.duration} min</span>
                            )}
                            {lesson.isPreview ? (
                              <Link
                                to={`/lessons/${lesson.id}`}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 hover:bg-emerald-200 transition"
                              >
                                Free Preview
                              </Link>
                            ) : !isEnrolled ? (
                              <span className="text-xs text-gray-300 font-medium">Locked</span>
                            ) : (
                              <Link
                                to={`/lessons/${lesson.id}`}
                                className="text-xs font-semibold text-emerald-600 hover:underline"
                              >
                                Open
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic py-4 text-center">No modules published yet.</p>
              )}
            </div>
          </div>

          {/* Student Reviews & Feedback */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Student Reviews</h2>
              <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>4.9 / 5.0</span>
                <span className="text-xs text-gray-400 font-normal">(128 ratings)</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      SR
                    </div>
                    <span className="text-xs font-bold text-gray-900">Sophea R. (Credit Analyst, ABA Bank)</span>
                  </div>
                  <div className="flex text-amber-400">
                    {"★★★★★"}
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  "The coverage of NBC regulatory ratios and CBC scoring combined with the interactive EMI calculator saved me dozens of hours on my practical evaluations."
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      VM
                    </div>
                    <span className="text-xs font-bold text-gray-900">Vireak M. (Fintech Developer)</span>
                  </div>
                  <div className="flex text-amber-400">
                    {"★★★★★"}
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  "Clear, crisp explanation of KHQR ISO20022 message specs and Bakong webhook security. Best fintech learning resource in Phnom Penh."
                </p>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full text-left px-4 py-3 font-semibold text-sm text-gray-800 flex items-center justify-between hover:bg-gray-50"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="px-4 pb-3 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Instructor Profile & Prerequisites */}
        <div className="lg:col-span-4 space-y-6">
          {/* Instructor Bio Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">About the Instructor</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-sm">
                {course.instructor?.firstName?.[0] || "I"}
                {course.instructor?.lastName?.[0] || "N"}
              </div>
              <div>
                <h4 className="font-bold text-gray-900">
                  {course.instructor?.firstName} {course.instructor?.lastName}
                </h4>
                <p className="text-xs text-emerald-700 font-medium">Fintech Architect & Educator</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>★ 4.9 Rating</span>
                  <span>•</span>
                  <span>1,420+ Students</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-600 leading-relaxed">
              Practicing banking technologist and lecturer specialized in Cambodian payment infrastructures, risk analytics, and enterprise e-learning solutions.
            </p>
          </div>

          {/* Prerequisites */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Prerequisites</h3>
            <ul className="space-y-2 text-xs text-gray-600">
              {prerequisites.map((p: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust & Guarantee */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              100% Certified Learning Guarantee
            </div>
            <p className="text-xs text-emerald-900/80 leading-relaxed">
              Every course includes continuous assessment, tamper-evident certificate issuance, and direct access to instructor discussion forums.
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Cambodian Regulatory & Educational Disclaimer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-xs flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">National Financial Education Notice: </span>
          All materials, case studies, calculators, and simulations provided in this course are strictly intended for academic and vocational training. They do not constitute certified personal financial, tax, or investment advice under the laws of the Kingdom of Cambodia and regulations of the National Bank of Cambodia (NBC).
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile & Quick Purchase */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-xl px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-xs text-gray-500 line-clamp-1">{course.title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {isFreeCourse ? "Free" : `$${priceUsd.toFixed(2)} USD`}
              </span>
              {!isFreeCourse && (
                <span className="text-xs text-emerald-700 font-medium">
                  (≈ {priceKhr} ៛)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isEnrolled ? (
              <button
                onClick={() => {
                  const firstLessonId = course.modules?.[0]?.lessons?.[0]?.id;
                  if (firstLessonId) navigate(`/lessons/${firstLessonId}`);
                  else toast.error("No lessons published yet");
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition"
              >
                <CheckCircle className="h-4 w-4" /> Go to Course Player
              </button>
            ) : isFreeCourse ? (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition"
              >
                Enroll Free
              </button>
            ) : (
              <button
                onClick={handleBuy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition"
              >
                <CreditCard className="h-4 w-4" /> Enroll Now • ${priceUsd.toFixed(2)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};