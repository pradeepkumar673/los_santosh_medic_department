import { Link } from "react-router-dom";
import { ShieldAlert, Compass } from "lucide-react";

export function UnauthorizedPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
      <ShieldAlert className="h-12 w-12 text-amber-500" />
      <h1 className="text-xl font-semibold text-slate-800">Access denied</h1>
      <p className="max-w-sm text-sm text-slate-500">Your account doesn't have permission to view this page.</p>
      <Link to="/" className="mt-2 text-sm font-medium text-teal-600 hover:underline">Back to dashboard</Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
      <Compass className="h-12 w-12 text-slate-400" />
      <h1 className="text-xl font-semibold text-slate-800">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="mt-2 text-sm font-medium text-teal-600 hover:underline">Back to dashboard</Link>
    </div>
  );
}
