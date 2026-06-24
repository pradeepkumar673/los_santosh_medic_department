import { createBrowserRouter, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import { ProtectedRoute, RoleRoute, RoleIndexRedirect } from "../routes/guards";
import { PageStub } from "../components/common/Feedback";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ProfilePage from "../pages/profile/ProfilePage";
import { UnauthorizedPage, NotFoundPage } from "../pages/errors";
import PatientDashboardPage from "../pages/patient/PatientDashboardPage";
import LiveQueuePage from "../pages/patient/LiveQueuePage";
import MedicalHistoryPage from "../pages/patient/MedicalHistoryPage";
import BookAppointmentPage from "../pages/patient/BookAppointmentPage";
import MyAppointmentsPage from "../pages/patient/MyAppointmentsPage";

const PatientAppointments = () => {
  const navigate = useNavigate();
  return <MyAppointmentsPage onBook={() => navigate("/patient/book")} />;
};

const PatientBookAppointment = () => {
  const navigate = useNavigate();
  return <BookAppointmentPage onBooked={() => navigate("/patient/appointments")} />;
};

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/", element: <RoleIndexRedirect /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/unauthorized", element: <UnauthorizedPage /> },
          {
            element: <RoleRoute allowedRoles={["patient"]} />,
            children: [
              { path: "/patient/dashboard", element: <PatientDashboardPage /> },
              { path: "/patient/book", element: <PatientBookAppointment /> },
              { path: "/patient/appointments", element: <PatientAppointments /> },
              { path: "/patient/queue", element: <LiveQueuePage /> },
              { path: "/patient/history", element: <MedicalHistoryPage /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["doctor"]} />,
            children: [
              { path: "/doctor/dashboard", element: <PageStub title="Doctor Dashboard" /> },
              { path: "/doctor/queue", element: <PageStub title="Live Queue" /> },
              { path: "/doctor/appointments", element: <PageStub title="Appointments" /> },
              { path: "/doctor/patients", element: <PageStub title="My Patients" /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["nurse"]} />,
            children: [
              { path: "/nurse/dashboard", element: <PageStub title="Nurse Dashboard" /> },
              { path: "/nurse/beds", element: <PageStub title="Bed Board" /> },
              { path: "/nurse/queue", element: <PageStub title="Queue Monitor" /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["reception", "admin"]} />,
            children: [
              { path: "/reception/dashboard", element: <PageStub title="Reception Dashboard" /> },
              { path: "/reception/appointments", element: <PageStub title="Appointments" /> },
              { path: "/reception/queue", element: <PageStub title="Queue Management" /> },
              { path: "/reception/beds", element: <PageStub title="Bed Board" /> },
              { path: "/reception/patients", element: <PageStub title="Patients" /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={["admin"]} />,
            children: [
              { path: "/admin/dashboard", element: <PageStub title="Admin Dashboard" /> },
              { path: "/admin/departments", element: <PageStub title="Departments" /> },
              { path: "/admin/doctors", element: <PageStub title="Doctors" /> },
              { path: "/admin/users", element: <PageStub title="Staff & Users" /> },
              { path: "/admin/patients", element: <PageStub title="Patients" /> },
              { path: "/admin/beds", element: <PageStub title="Bed Board" /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
