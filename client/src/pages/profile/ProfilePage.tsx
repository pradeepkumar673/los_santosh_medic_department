import { useAuthStore } from "../../store/authStore";
import { ROLE_LABELS } from "../../config/sidebarConfig";

export default function ProfilePage() {
  const { user, profile } = useAuthStore();
  if (!user) return null;

  return (
    <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-800">My profile</h1>
      <dl className="mt-4 divide-y divide-slate-100 text-sm">
        <Row label="Name" value={user.name} />
        <Row label="Email" value={user.email} />
        <Row label="Phone" value={user.phone || "—"} />
        <Row label="Role" value={ROLE_LABELS[user.role]} />
        {profile != null && <Row label="Profile data" value={JSON.stringify(profile)} />}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
