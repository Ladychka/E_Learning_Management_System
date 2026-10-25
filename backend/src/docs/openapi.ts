export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ELMS — Fintech E-Learning Management System API",
    version: "1.0.0",
    description: "Production API for Cambodian Fintech E-Learning Management System, featuring Bakong KHQR integration, course authoring, weighted gradebooks, and certificate verification.",
    contact: {
      name: "ELMS Engineering Team",
      url: "https://aub.edu.kh",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "Primary v1 API gateway",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Service Health Check",
        responses: {
          200: { description: "API and DB status" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "User Authentication",
        description: "Authenticate with email and password to receive access & refresh tokens.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", example: "student@elms.edu.kh" },
                  password: { type: "string", example: "Password123!" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          200: { description: "Authentication successful with JWT tokens" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/courses": {
      get: {
        summary: "List Published Courses",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "level", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "List of courses with enrollment counts and pricing" },
        },
      },
      post: {
        summary: "Create Course (Instructor / Admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "Course draft created" },
        },
      },
    },
    "/payments/checkout": {
      post: {
        summary: "Create Course Checkout / KHQR Session",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  courseId: { type: "string" },
                  gateway: { type: "string", enum: ["khqr", "aba_payway", "bakong"] },
                  couponCode: { type: "string" },
                },
                required: ["courseId", "gateway"],
              },
            },
          },
        },
        responses: {
          200: { description: "KHQR image, payment ID, and transaction metadata returned" },
        },
      },
    },
    "/certificates/verify/{certificateNumber}": {
      get: {
        summary: "Public Certificate Verification",
        parameters: [
          { name: "certificateNumber", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Certificate validation status, recipient name, course title, and issue date" },
          404: { description: "Certificate not found or revoked" },
        },
      },
    },
  },
};

export function renderSwaggerHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ELMS API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" />
  <style>
    body { margin: 0; padding: 0; background: #fafafa; font-family: sans-serif; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "${specUrl}",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
}
