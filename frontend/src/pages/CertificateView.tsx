import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { certificateApi } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  Award,
  CheckCircle,
  Share2,
  Printer,
  Copy,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

interface Certificate {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  downloadedAt?: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    duration?: number;
  };
  enrollment: {
    enrolledAt: string;
    completedAt?: string;
  };
}

export const CertificateView = () => {
  const { id, certificateNumber } = useParams<{ id?: string; certificateNumber?: string }>();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadCertificate();
  }, [id, certificateNumber]);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      if (certificateNumber) {
        // Public verification lookup by certificate number
        const res = await certificateApi.verifyCertificate(certificateNumber);
        setCertificate(res.data.data);
      } else if (id) {
        // ID lookup
        const res = await certificateApi.getCertificate(id);
        setCertificate(res.data.data);
      }
    } catch {
      toast.error("Failed to load certificate");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!certificate?.certificateNumber) return;
    try {
      setVerifying(true);
      const res = await certificateApi.verifyCertificate(certificate.certificateNumber);
      if (res.data.data) {
        toast.success("Certificate verified: Active & Authentic");
      }
    } catch {
      toast.error("Certificate verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/verify/${certificate?.certificateNumber}`;
    navigator.clipboard.writeText(url);
    toast.success("Public verification link copied to clipboard!");
  };

  const handleShareLinkedIn = () => {
    if (!certificate) return;
    const certUrl = `${window.location.origin}/verify/${certificate.certificateNumber}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}`;
    window.open(linkedInUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="py-16 text-center text-slate-500 max-w-md mx-auto">
        <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Certificate Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          The requested certificate identifier does not exist or has been revoked.
        </p>
        <div className="mt-4">
          <button onClick={() => navigate(-1)} className="btn-secondary text-xs">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Return
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${certificate.user.firstName} ${certificate.user.lastName}`;
  const verificationUrl = `${window.location.origin}/verify/${certificate.certificateNumber}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verificationUrl)}`;

  return (
    <div className="mx-auto max-w-3xl py-8 px-4 print:p-0 print:m-0 print:max-w-none">
      {/* Top action bar (hidden during print) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="btn-secondary text-xs inline-flex items-center gap-1.5"
            title="Copy verification link"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </button>
          <button
            onClick={handleShareLinkedIn}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
            title="Share on LinkedIn"
          >
            <Share2 className="h-3.5 w-3.5" /> LinkedIn
          </button>
          <button
            onClick={() => window.print()}
            className="btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main Certificate Display Card */}
      <div className="bg-white rounded-2xl border-4 border-double border-emerald-700/60 shadow-xl overflow-hidden print:border-2 print:shadow-none">
        {/* Certificate Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 px-8 py-10 text-center text-white relative">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 shadow-inner">
            <Award className="h-8 w-8 text-emerald-300" />
          </div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-300 block">
            FinTech E-Learning Management System • Cambodia
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
            Certificate of Completion
          </h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-md mx-auto">
            This certifies that the recipient has satisfactorily satisfied all curriculum modules, assessments, and standards.
          </p>
        </div>

        {/* Certificate Body */}
        <div className="px-8 py-8 text-center space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Awarded To</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-slate-900 border-b-2 border-emerald-600/30 pb-2 inline-block px-8">
              {fullName}
            </h2>
          </div>

          <div>
            <p className="text-xs text-slate-500">For successfully mastering the specialized coursework in</p>
            <Link
              to={`/courses/${certificate.course.id}`}
              className="mt-1 block text-lg sm:text-xl font-bold text-emerald-800 hover:underline"
            >
              {certificate.course.title}
            </Link>
          </div>

          {/* Details & Verification Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-left">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Certificate ID</p>
              <p className="font-mono text-xs font-bold text-slate-800 mt-0.5 break-all">
                {certificate.certificateNumber}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Issue Date</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {new Date(certificate.issuedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Status</p>
              <div className="flex items-center gap-1 mt-0.5 text-xs font-bold text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Verified Active
              </div>
            </div>
            <div className="flex items-center justify-end sm:border-l sm:pl-3">
              <div className="text-center">
                <img
                  src={qrCodeImageUrl}
                  alt="QR Verification"
                  className="w-16 h-16 rounded border bg-white p-0.5 shadow-sm inline-block"
                />
                <span className="text-[9px] text-slate-400 block mt-0.5">Scan to Verify</span>
              </div>
            </div>
          </div>

          {/* Signatures & Disclaimers */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="text-left">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Authentic Digital Credential</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Verified on the ELMS National Registry: <span className="font-mono text-[10px] text-slate-600">{verificationUrl}</span>
              </p>
            </div>

            <button
              onClick={handleVerify}
              disabled={verifying}
              className="btn-secondary text-xs inline-flex items-center gap-1 print:hidden"
            >
              {verifying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              )}
              Re-verify Status
            </button>
          </div>
        </div>

        {/* Regulatory Educational Notice */}
        <div className="bg-slate-50 px-8 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span>FinTech E-Learning Management System (ELMS)</span>
          <span>Educational achievement credential; not a formal financial license</span>
        </div>
      </div>
    </div>
  );
};
