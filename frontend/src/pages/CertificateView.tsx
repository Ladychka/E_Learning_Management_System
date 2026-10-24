import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { certificateApi } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  Award,
  Calendar,
  Hash,
  BookOpen,
  CheckCircle,
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadCertificate();
  }, [id]);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      const res = await certificateApi.getCertificate(id!);
      setCertificate(res.data.data);
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
      const res = await certificateApi.verifyCertificate(
        certificate.certificateNumber
      );
      if (res.data.data) {
        toast.success("Certificate is valid and verified.");
      }
    } catch {
      toast.error("Certificate verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="py-12 text-center text-gray-500">
        Certificate not found.
        <div className="mt-4">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="mr-1 h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${certificate.user.firstName} ${certificate.user.lastName}`;

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">Certificate</h1>
      </div>

      <div className="card overflow-hidden border-2 border-primary-100">
        {/* Certificate Header */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-8 py-10 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Award className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-medium uppercase tracking-widest opacity-80">
            Certificate of Completion
          </p>
          <h2 className="mt-2 text-3xl font-bold">{fullName}</h2>
        </div>

        {/* Certificate Body */}
        <div className="px-8 py-8 text-center">
          <p className="text-gray-500">
            Has successfully completed the course
          </p>
          <Link
            to={`/courses/${certificate.course.id}`}
            className="mt-2 block text-xl font-bold text-primary-700 hover:underline"
          >
            {certificate.course.title}
          </Link>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-1 rounded-lg bg-gray-50 p-4">
              <Calendar className="h-5 w-5 text-gray-400" />
              <p className="text-xs text-gray-500">Issued</p>
              <p className="font-semibold text-gray-800">
                {new Date(certificate.issuedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg bg-gray-50 p-4">
              <Hash className="h-5 w-5 text-gray-400" />
              <p className="text-xs text-gray-500">Certificate No.</p>
              <p className="font-mono text-sm font-semibold text-gray-800">
                {certificate.certificateNumber}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg bg-gray-50 p-4">
              <BookOpen className="h-5 w-5 text-gray-400" />
              <p className="text-xs text-gray-500">Course Duration</p>
              <p className="font-semibold text-gray-800">
                {certificate.course.duration
                  ? `${certificate.course.duration} min`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-8 py-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {certificate.user.firstName[0]}
                {certificate.user.lastName[0]}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-gray-500">{certificate.user.email}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="btn-secondary"
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="mr-1 h-4 w-4" /> Verify
                  </>
                )}
              </button>
              <button
                onClick={() => window.print()}
                className="btn-primary"
              >
                Print / Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
