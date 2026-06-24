import { useState } from "react";

/*
const doctors = [
  { id: 1, name: "Dr. Kavitha Ramesh", spec: "Cardiologist", dept: "Cardiology", exp: "12 yrs", fee: 600, avail: "available", rating: "4.9", initials: "KR" },
  { id: 2, name: "Dr. Arun Mehta", spec: "Orthopaedic Surgeon", dept: "Orthopedics", exp: "9 yrs", fee: 500, avail: "available", rating: "4.7", initials: "AM" },
  { id: 3, name: "Dr. Priya Nair", spec: "General Physician", dept: "General Medicine", exp: "7 yrs", fee: 350, avail: "busy", rating: "4.8", initials: "PN" },
  { id: 4, name: "Dr. Suresh Kumar", spec: "Paediatrician", dept: "Pediatrics", exp: "14 yrs", fee: 450, avail: "available", rating: "4.9", initials: "SK" },
  { id: 5, name: "Dr. Anitha Sharma", spec: "Dermatologist", dept: "Dermatology", exp: "6 yrs", fee: 400, avail: "available", rating: "4.6", initials: "AS" },
  { id: 6, name: "Dr. Ravi Chandran", spec: "Neurologist", dept: "Neurology", exp: "16 yrs", fee: 750, avail: "busy", rating: "4.8", initials: "RC" },
];
*/

export default function LoginRegisterPage({ onLogin }: { onLogin: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">MediQueue Patient Portal</h1>
          <p className="text-sm text-gray-500 mt-1">San Santosh Medical Department</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Tab Switch */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? "bg-white text-teal-600 shadow-sm" : "text-gray-500"
                }`}
              >
                {t === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
                <input type="email" placeholder="you@example.com" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-500">
                  <input type="checkbox" className="rounded" /> Remember me
                </label>
                <span className="text-teal-600 cursor-pointer hover:underline">Forgot password?</span>
              </div>
              <button onClick={onLogin} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                Sign in to portal
              </button>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex-1 border-t border-gray-200" />
                or
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <button className="w-full border border-gray-200 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.7 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
                  <path fill="#FBBC05" d="M10.6 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C1 16.2 0 20 0 24s1 7.8 2.7 11.1l7.9-6.5z"/>
                  <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.8 2.3-7.7 2.3-6.2 0-11.5-4.2-13.4-9.8l-7.9 6.5C6.6 42.6 14.6 48 24 48z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First name</label>
                  <input type="text" placeholder="Rajesh" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last name</label>
                  <input type="text" placeholder="Kumar" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
                <input type="email" placeholder="you@example.com" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
                <input type="tel" placeholder="9876543210" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date of birth</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Blood group</label>
                  <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50">
                    <option>Select...</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-teal-500 bg-gray-50" />
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-gray-500">
                <input type="checkbox" className="mt-0.5" />
                I agree to the <span className="text-teal-600 underline cursor-pointer">Terms of Service</span> and <span className="text-teal-600 underline cursor-pointer">Privacy Policy</span>
              </label>
              <button onClick={onLogin} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                Create patient account
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Protected by ABDM & HIPAA-compliant infrastructure</p>
      </div>
    </div>
  );
}
