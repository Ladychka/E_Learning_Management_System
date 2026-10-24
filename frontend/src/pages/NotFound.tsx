import { Link } from "react-router-dom";

export const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <h1 className="text-6xl font-bold text-primary-600">404</h1>
      <p className="mt-4 text-lg text-gray-600">Page not found.</p>
      <Link to="/" className="mt-6 btn-primary">
        Go Home
      </Link>
    </div>
  );
};