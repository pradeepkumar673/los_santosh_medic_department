import { Outlet } from "react-router-dom";
import { HeartPulse } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <HeartPulse className="h-10 w-10 text-teal-600" />
          <h1 className="text-2xl font-bold text-slate-800">MediQueue AI</h1>
          <p className="text-sm text-slate-500">Hospital management & queue system</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
