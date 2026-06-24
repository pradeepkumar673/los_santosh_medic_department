import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { DEFAULT_ROUTE_BY_ROLE } from "../../config/sidebarConfig";
import { UserRole } from "../../types/auth.types";

type FormValues = {
  role: UserRole;
  name: string; email: string; phone: string; password: string;
  dateOfBirth?: string; gender?: "male" | "female" | "other"; bloodGroup?: string;
  emergencyName?: string; emergencyRelation?: string; emergencyPhone?: string;
  addressLine1?: string; city?: string; state?: string; pincode?: string;
  department?: string; specialization?: string; licenseNumber?: string;
  adminInviteCode?: string;
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({ defaultValues: { role: "patient" } });
  const role = watch("role");

  const onSubmit = async (values: FormValues) => {
    // Why: backend expects a flat, role-shaped payload (discriminated union
    // on `role`) — translate the flat form state into that shape here.
    const base = { role: values.role, name: values.name, email: values.email, phone: values.phone, password: values.password };
    let payload: Record<string, unknown> = base;

    if (values.role === "patient") {
      payload = {
        ...base,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        bloodGroup: values.bloodGroup || "unknown",
        emergencyContact: { name: values.emergencyName, relation: values.emergencyRelation, phone: values.emergencyPhone },
        address: { line1: values.addressLine1, city: values.city, state: values.state, pincode: values.pincode },
      };
    } else if (values.role === "doctor") {
      payload = { ...base, department: values.department, specialization: values.specialization, licenseNumber: values.licenseNumber };
    } else if (values.role === "admin") {
      payload = { ...base, adminInviteCode: values.adminInviteCode };
    }

    try {
      await registerUser(payload);
      const user = useAuthStore.getState().user;
      navigate(user ? DEFAULT_ROUTE_BY_ROLE[user.role] : "/", { replace: true });
    } catch {
      toast.error(useAuthStore.getState().error || "Registration failed.");
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Create an account</h2>

      <div>
        <label className={labelClass}>I am a...</label>
        <select {...register("role")} className={inputClass}>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="reception">Reception / Front desk</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Full name</label>
          <input {...register("name", { required: true, minLength: 2 })} className={inputClass} />
          {errors.name && <p className="mt-1 text-xs text-red-500">Name is required</p>}
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input {...register("phone", { required: true, pattern: /^[0-9]{10}$/ })} className={inputClass} placeholder="10-digit number" />
          {errors.phone && <p className="mt-1 text-xs text-red-500">Enter a valid 10-digit phone</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input type="email" {...register("email", { required: true })} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Password</label>
        <input type="password" {...register("password", { required: true, minLength: 8 })} className={inputClass} placeholder="Min 8 chars, 1 upper, 1 lower, 1 number" />
      </div>

      {role === "patient" && (
        <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="date" {...register("dateOfBirth", { required: true })} className={inputClass} />
            <select {...register("gender", { required: true })} className={inputClass}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input {...register("emergencyName", { required: true })} className={inputClass} placeholder="Emergency contact name" />
            <input {...register("emergencyRelation", { required: true })} className={inputClass} placeholder="Relation" />
            <input {...register("emergencyPhone", { required: true })} className={inputClass} placeholder="Contact phone" />
          </div>
          <input {...register("addressLine1", { required: true })} className={inputClass} placeholder="Address line 1" />
          <div className="grid grid-cols-3 gap-3">
            <input {...register("city", { required: true })} className={inputClass} placeholder="City" />
            <input {...register("state", { required: true })} className={inputClass} placeholder="State" />
            <input {...register("pincode", { required: true })} className={inputClass} placeholder="Pincode" />
          </div>
        </div>
      )}

      {role === "doctor" && (
        <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <input {...register("department", { required: true })} className={inputClass} placeholder="Department ID" />
          <input {...register("specialization", { required: true })} className={inputClass} placeholder="Specialization" />
          <input {...register("licenseNumber", { required: true })} className={inputClass} placeholder="License number" />
          <p className="text-xs text-slate-400">Department should be a dropdown fetched from /api/departments — wire up once that screen exists.</p>
        </div>
      )}

      {role === "admin" && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <input {...register("adminInviteCode", { required: true })} className={inputClass} placeholder="Admin invite code" />
        </div>
      )}

      <button type="submit" disabled={isLoading} className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
        {isLoading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account? <Link to="/login" className="font-medium text-teal-600 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
