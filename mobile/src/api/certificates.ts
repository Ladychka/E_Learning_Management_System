import { apiClient } from "./client";

export type CertificateSummary = {
  id: string;
  certificateNumber: string;
  templateUrl?: string | null;
  issuedAt: string;
  downloadedAt?: string | null;
  course: { id: string; title: string; thumbnailUrl?: string | null };
};

export type CertificateDetail = CertificateSummary & {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  course: {
    id: string;
    title: string;
    duration?: number | null;
    thumbnailUrl?: string | null;
  };
  enrollment?: {
    enrolledAt: string;
    completedAt?: string | null;
  } | null;
};

export async function getMyCertificates() {
  const response = await apiClient.get("/certificates/my-certificates", {
    params: { limit: 50 },
  });
  return (response.data?.data ?? []) as CertificateSummary[];
}

export async function getCertificate(certificateId: string) {
  const response = await apiClient.get(`/certificates/${certificateId}`);
  return response.data.data as CertificateDetail;
}
