import { useState } from "react";
import {
  CloudRain,
  Wind,
  Thermometer,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  MapPin,
} from "lucide-react";
import { useEmergencyStore } from "../../store/emergencyStore";

const LEVEL_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  low: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "text-green-500",
  },
  moderate: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    icon: "text-yellow-500",
  },
  high: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-800",
    icon: "text-orange-500",
  },
  very_high: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-800",
    icon: "text-red-500",
  },
  critical: {
    bg: "bg-red-100",
    border: "border-red-400",
    text: "text-red-900",
    icon: "text-red-600",
  },
};

export default function WeatherRiskBanner() {
  const { weatherRisk, weatherAutoIncident, checkWeather, loading } =
    useEmergencyStore();
  const [lat, setLat] = useState("13.0827");
  const [lng, setLng] = useState("80.2707");
  const [address, setAddress] = useState("Chennai, Tamil Nadu");
  const [expanded, setExpanded] = useState(false);

  const handleCheck = () => {
    checkWeather(parseFloat(lat), parseFloat(lng), address);
  };

  const style = weatherRisk
    ? LEVEL_STYLES[weatherRisk.riskLevel] ?? LEVEL_STYLES.low
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CloudRain className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Weather Risk Monitor</h3>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-teal-600 hover:underline"
        >
          {expanded ? "Collapse" : "Configure"}
        </button>
      </div>

      {/* Input Panel */}
      {expanded && (
        <div id="weather-cfg" className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-[11px] text-slate-500 font-medium">Latitude</label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium">Longitude</label>
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] text-slate-500 font-medium">Address</label>
            <div className="flex gap-1">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button
                onClick={handleCheck}
                disabled={loading}
                className="flex items-center gap-1 whitespace-nowrap rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {weatherRisk && style && (
        <div className={`px-5 py-4 ${style.bg}`}>
          <div className="flex items-start gap-3">
            {weatherRisk.disasterRiskScore >= 50 ? (
              <AlertTriangle className={`h-6 w-6 mt-0.5 flex-shrink-0 ${style.icon}`} />
            ) : (
              <ShieldCheck className={`h-6 w-6 mt-0.5 flex-shrink-0 ${style.icon}`} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-bold uppercase ${style.text}`}>
                  {weatherRisk.riskLevel.replace("_", " ")} risk
                </span>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${style.text} ${style.border} border`}
                >
                  Score {weatherRisk.disasterRiskScore}/100
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat
                  icon={<Thermometer className="h-4 w-4 text-orange-400" />}
                  label="Temp"
                  value={`${weatherRisk.temperature}°C`}
                />
                <Stat
                  icon={<CloudRain className="h-4 w-4 text-blue-400" />}
                  label="Rain"
                  value={`${weatherRisk.precipitation} mm`}
                />
                <Stat
                  icon={<Wind className="h-4 w-4 text-cyan-500" />}
                  label="Wind"
                  value={`${weatherRisk.wind_speed} km/h`}
                />
                <Stat
                  icon={
                    <span className="text-[13px]">⚡</span>
                  }
                  label="WMO Code"
                  value={String(weatherRisk.weather_code)}
                />
              </div>
            </div>
          </div>
          {weatherAutoIncident && (
            <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
              <strong>Auto-created incident:</strong> {weatherAutoIncident.eventType} —{" "}
              {weatherAutoIncident.severity} severity
            </div>
          )}
        </div>
      )}

      {!weatherRisk && !loading && (
        <div className="px-5 py-6 text-center text-sm text-slate-400">
          Click <strong>Configure → Check</strong> to scan weather risks for any coordinates
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="leading-tight">
        <p className="text-[10px] text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
