import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Award, BookOpen, Loader2, ExternalLink } from "lucide-react";
import { certificateApi } from "@/lib/api";

interface Certificate {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  downloadedAt?: string;
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
}

export function MyCertificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const res = await certificateApi.getMyCertificates();
      setCertificates(res.data.data || []);
    } catch {
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Certificates</h1>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <BookOpen className="w-4 h-4" />
          Browse Courses
        </Link>
      </div>

      {certificates.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            You haven't earned any certificates yet.
          </p>
          <Link
            to="/my-enrollments"
            className="text-blue-600 hover:underline font-medium"
          >
            View your enrollments
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition"
            >
              <div className="h-32 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Award className="h-12 w-12 text-white opacity-90" />
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Certificate of Completion
                  </p>
                  <Link
                    to={`/courses/${cert.course.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-primary-600 line-clamp-2"
                  >
                    {cert.course.title}
                  </Link>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>
                    Issued:{" "}
                    {new Date(cert.issuedAt).toLocaleDateString()}
                  </p>
                  <p className="font-mono text-xs text-gray-400">
                    {cert.certificateNumber}
                  </p>
                </div>
                <Link
                  to={`/certificates/${cert.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  View Certificate
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
