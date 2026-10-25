import * as nodemailer from "nodemailer";
import { config } from "../config";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => {
  if (!config.smtp.user) {
    console.log("[EMAIL MOCK] To:", to, "Subject:", subject);
    return { messageId: "mock-" + Date.now() };
  }

  return transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
    text,
  });
};

export const sendVerificationEmail = async (
  email: string,
  token: string
) => {
  const url = `${config.frontendUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your ELMS account",
    html: `
      <h1>Welcome to ELMS!</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${url}" style="padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:4px;">Verify Email</a>
      <p>Or copy this URL: ${url}</p>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string
) => {
  const url = `${config.frontendUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your ELMS password",
    html: `
      <h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${url}" style="padding:10px 20px;background:#dc3545;color:white;text-decoration:none;border-radius:4px;">Reset Password</a>
      <p>Or copy this URL: ${url}</p>
      <p>This link expires in 1 hour.</p>
    `,
  });
};

export const sendGradePublishedEmail = async ({
  email,
  studentName,
  courseTitle,
  assessmentTitle,
  percentage,
  letterGrade,
  passFail,
}: {
  email: string;
  studentName: string;
  courseTitle: string;
  assessmentTitle: string;
  percentage: number;
  letterGrade: string;
  passFail: string;
}) => {
  const gradeUrl = `${config.frontendUrl}/my-grades`;
  await sendEmail({
    to: email,
    subject: `Grade published: ${assessmentTitle}`,
    html: `
      <h1>Your Grade is Ready</h1>
      <p>Hi ${studentName},</p>
      <p>Your grade for <strong>${assessmentTitle}</strong> in <strong>${courseTitle}</strong> has been published.</p>
      <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0;">
        <p style="margin:0;font-size:24px;font-weight:bold;">${percentage}% <span style="font-size:16px;color:#6c757d;">(${letterGrade})</span></p>
        <p style="margin:8px 0 0 0;color:${passFail === "pass" ? "#28a745" : "#dc3545"};font-weight:bold;">${passFail === "pass" ? "✓ Passed" : "✗ Did Not Pass"}</p>
      </div>
      <a href="${gradeUrl}" style="padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:4px;">View My Grades</a>
      <p style="color:#6c757d;font-size:12px;">This is an automated notification from ELMS.</p>
    `,
  });
};

export const sendAppealResultEmail = async ({
  email,
  studentName,
  courseTitle,
  assessmentTitle,
  status,
  response,
}: {
  email: string;
  studentName: string;
  courseTitle: string;
  assessmentTitle: string;
  status: string;
  response?: string;
}) => {
  const gradeUrl = `${config.frontendUrl}/my-grades`;
  const isApproved = status.toLowerCase() === "approved";
  await sendEmail({
    to: email,
    subject: `Grade Appeal Result: ${assessmentTitle} - ${status.toUpperCase()}`,
    html: `
      <h1>Grade Appeal Update</h1>
      <p>Hi ${studentName},</p>
      <p>Your grade appeal for <strong>${assessmentTitle}</strong> in <strong>${courseTitle}</strong> has been <strong>${status.toUpperCase()}</strong>.</p>
      ${response ? `<div style="background:#f8f9fa;padding:16px;border-left:4px solid ${isApproved ? '#28a745' : '#dc3545'};margin:16px 0;"><p style="margin:0;"><strong>Instructor Response:</strong></p><p style="margin:8px 0 0 0;">${response}</p></div>` : ""}
      <a href="${gradeUrl}" style="padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:4px;">View My Grades</a>
      <p style="color:#6c757d;font-size:12px;">This is an automated notification from ELMS.</p>
    `,
  });
};