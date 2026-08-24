import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Siren } from "lucide-react";
import toast from "react-hot-toast";
import { useEmergencyStore } from "../../store/emergencyStore";

export default function CreateIncidentPage() {
  const navigate = useNavigate();
  const { createNewIncident, loading } = useEmergencyStore();

  const [form, setForm] = useState({
    eventType: "",
    address: "Chennai, Tamil Nadu",
    lat: "13.0827",
    lng: "80.2707",
    severity: "high",
    reportedCasualties: 5,
    confidenceScore: 0.85,
    source: "Field Dispatch",
    predictedArrivals: 5,
  });

  const set = (key: string, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.eventType) {
      toast.error("Event type is required");
      return;
    }

    try {
      const created = await createNewIncident({
        eventType: form.eventType,
        location: {
          address: form.address,
          coordinates: {
            type: "Point",
            coordinates: [parseFloat(form.lng), parseFloat(form.lat)],
          },
        },
        severity: form.severity as any,
        reportedCasualties: Number(form.reportedCasualties),
        confidenceScore: Number(form.confidenceScore),
        source: form.source,
        predictedArrivals: Number(form.predictedArrivals),
      });

      toast.success("Incident created successfully!");
      navigate(`/emergency/incidents/${created._id}`);
    } catch {
      toast.error("Failed to create incident");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/emergency")} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Siren className="h-5 w-5 text-red-500" />
            Create Incident
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manually report an emergency event for the EmergencyFlow system
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-5"
      >
        <Field label="Event Type *">
          <input
            value={form.eventType}
            onChange={(e) => set("eventType", e.target.value)}
            placeholder="e.g. Multi-vehicle accident on OMR highway"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </Field>

        <Field label="Location Address">
          <input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="e.g. OMR Highway near Sholinganallur junction"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input
              value={form.lat}
              onChange={(e) => set("lat", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </Field>
          <Field label="Longitude">
            <input
              value={form.lng}
              onChange={(e) => set("lng", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Severity">
            <select
              value={form.severity}
              onChange={(e) => set("severity", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </Field>
          <Field label="Source">
            <input
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Reported Casualties">
            <input
              type="number"
              min={0}
              value={form.reportedCasualties}
              onChange={(e) => set("reportedCasualties", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </Field>
          <Field label="Predicted Arrivals">
            <input
              type="number"
              min={0}
              value={form.predictedArrivals}
              onChange={(e) => set("predictedArrivals", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </Field>
          <Field label="Confidence (0–1)">
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={form.confidenceScore}
              onChange={(e) => set("confidenceScore", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/emergency")}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Incident
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
