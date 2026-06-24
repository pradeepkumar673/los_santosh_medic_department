import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { CalendarClock, Stethoscope, ListChecks, ClipboardList, AlertCircle } from "lucide-react";

export default function PatientDashboardPage() {
  const { user } = useAuthStore();
  const patientName = user?.name || "Rajesh Kumar";

  const stats = [
    { label: "Total Visits", value: "14", color: "text-teal-600 bg-teal-50" },
    { label: "Active Prescriptions", value: "3", color: "text-blue-600 bg-blue-50" },
    { label: "Chronic Conditions", value: "2", color: "text-amber-600 bg-amber-50" },
    { label: "Blood Group", value: "B+", color: "text-red-600 bg-red-50" },
  ];

  const quickActions = [
    {
      title: "Book Appointment",
      description: "Schedule a consult or follow-up with our specialists.",
      path: "/patient/book",
      icon: Stethoscope,
      color: "bg-teal-500 hover:bg-teal-600 text-white",
    },
    {
      title: "Queue Status",
      description: "Track your place in the live OPD queue in real-time.",
      path: "/patient/queue",
      icon: ListChecks,
      color: "bg-blue-500 hover:bg-blue-600 text-white",
    },
    {
      title: "My Appointments",
      description: "View upcoming visits and reschedule or cancel options.",
      path: "/patient/appointments",
      icon: CalendarClock,
      color: "bg-purple-500 hover:bg-purple-600 text-white",
    },
    {
      title: "Medical History",
      description: "Access diagnostic records, clinical notes & prescriptions.",
      path: "/patient/history",
      icon: ClipboardList,
      color: "bg-amber-500 hover:bg-amber-600 text-white",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-3xl p-6 sm:p-8 text-white shadow-md mb-8 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Stethoscope className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <span className="bg-teal-700/50 text-xs px-3 py-1 rounded-full font-medium tracking-wide uppercase">Patient Portal</span>
          <h1 className="text-2xl sm:text-4xl font-bold mt-3">Hello, {patientName}!</h1>
          <p className="text-teal-50/90 text-sm sm:text-base mt-2 max-w-xl">
            Welcome to your MediQueue health dashboard. Book consultations, monitor queue positions, and access medical records dynamically.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">{stat.label}</div>
            <div className={`text-2xl font-bold mt-2 inline-block px-3 py-0.5 rounded-xl ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Quick Actions Grid */}
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>⚡</span> Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <Link
                  key={idx}
                  to={action.path}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white bg-teal-500`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">{action.title}</h3>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{action.description}</p>
                  </div>
                  <div className="text-xs font-semibold text-teal-600 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Launch Action &rarr;
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar Alerts / Next appointment */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>🔔</span> Updates & Alerts
          </h2>
          
          {/* Upcoming Appointment Widget */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">Next Appointment</span>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Confirmed</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  KR
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Dr. Kavitha Ramesh</h4>
                  <p className="text-xs text-gray-500">Cardiology OPD</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-semibold text-gray-900">Wed, 25 Jun 2026</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-semibold text-gray-900">10:30 AM</span>
                </div>
              </div>
            </div>
            <Link
              to="/patient/queue"
              className="block text-center w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
            >
              Monitor Live Queue Position
            </Link>
          </div>

          {/* AI Predict Tip */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 leading-relaxed">
              <span className="font-bold">Did you know?</span> Our automated queue forecasting predicts wait times using deep history & real-time load analytics. Try to arrive exactly 10 minutes early!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
