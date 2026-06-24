import { Loader2 } from "lucide-react";

export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function PageStub({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {description ?? "Wired into routing and role-based access control — content lands in the next phase."}
      </p>
    </div>
  );
}
