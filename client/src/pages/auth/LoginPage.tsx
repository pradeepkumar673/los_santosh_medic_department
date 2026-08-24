import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { DEFAULT_ROUTE_BY_ROLE } from "../../config/sidebarConfig";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@mediqueue.com", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { role: "Doctor", email: "dr.arjun@mediqueue.com", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { role: "Nurse", email: "nurse1@mediqueue.com", color: "bg-teal-100 text-teal-700 hover:bg-teal-200" },
  { role: "Reception", email: "reception@mediqueue.com", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { role: "Patient", email: "rajesh.krishnan@gmail.com", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const fillDemo = (email: string) => {
    setValue("email", email);
    setValue("password", "Demo@1234");
  };

  const onSubmit = async (values: LoginForm) => {
    try {
      await login(values);
      const user = useAuthStore.getState().user;
      const redirectTo = (location.state as any)?.from?.pathname || (user ? DEFAULT_ROUTE_BY_ROLE[user.role] : "/");
      navigate(redirectTo, { replace: true });
    } catch {
      toast.error(useAuthStore.getState().error || "Login failed.");
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Sign in</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input type="email" {...register("email")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="you@example.com" />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input type="password" {...register("password")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="••••••••" />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">
          {isLoading ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Don't have an account? <Link to="/register" className="font-medium text-teal-600 hover:underline">Register</Link>
        </p>
      </form>

      {/* Quick Demo Login Fill Buttons */}
      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Demo Accounts (Click to Fill)</p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => fillDemo(acc.email)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${acc.color}`}
            >
              {acc.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
