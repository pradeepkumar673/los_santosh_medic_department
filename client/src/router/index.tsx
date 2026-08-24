import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import { ProtectedRoute, RoleRoute, RoleIndexRedirect } from "../routes/guards";
import { PageStub } from "../components/common/Feedback";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ProfilePage from "../pages/profile/ProfilePage";
import { UnauthorizedPage, NotFoundPage } from "../pages/errors/index";

/* patient */
import PatientDashboardPage from "../pages/patient/PatientDashboardPage";
import BookAppointmentPage from "../pages/patient/BookAppointmentPage";
import MyAppointmentsPage from "../pages/patient/MyAppointmentsPage";
import LiveQueuePage from "../pages/patient/LiveQueuePage";
import MedicalHistoryPage from "../pages/patient/MedicalHistoryPage";

/* doctor */
import DoctorDashboardPage from "../pages/doctor/DoctorDashboardPage";
import DoctorQueuePage from "../pages/doctor/DoctorQueuePage";

/* reception */
import ReceptionDashboard from "../pages/reception/ReceptionDashboard";

/* emergency */
import CommandCenter from "../pages/emergency/CommandCenter";
import VentilatorDashboard from "../pages/emergency/VentilatorDashboard";
import IncidentDetail from "../pages/emergency/IncidentDetail";
import CreateIncidentPage from "../pages/emergency/CreateIncidentPage";
import RecommendationsPage from "../pages/emergency/RecommendationsPage";
import Simulator from "../pages/emergency/Simulator";

export const router = createBrowserRouter([
  /* Auth routes */
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  /* Protected routes */
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          /* Redirector */
          { index: true, element: <RoleIndexRedirect /> },

          /* Profile */
          { path: "profile", element: <ProfilePage /> },

          /* Patient */
          {
            path: "patient",
            element: <RoleRoute allowedRoles={["patient"]} />,
            children: [
              { index: true, element: <PatientDashboardPage /> },
              { path: "book", element: <BookAppointmentPage /> },
              { path: "appointments", element: <MyAppointmentsPage /> },
              { path: "queue", element: <LiveQueuePage /> },
              { path: "history", element: <MedicalHistoryPage /> },
            ],
          },

          /* Doctor */
          {
            path: "doctor",
            element: <RoleRoute allowedRoles={["doctor"]} />,
            children: [
              { index: true, element: <DoctorDashboardPage /> },
              { path: "queue", element: <DoctorQueuePage /> },
            ],
          },

          /* Reception */
          {
            path: "reception",
            element: <RoleRoute allowedRoles={["reception"]} />,
            children: [
              { index: true, element: <ReceptionDashboard /> },
              { path: "queue", element: <PageStub title="Queue Management" /> },
              { path: "appointments", element: <PageStub title="Appointments" /> },
              { path: "beds", element: <PageStub title="Bed Management" /> },
              { path: "patients", element: <PageStub title="Patient Registry" /> },
            ],
          },

          /* Nurse */
          {
            path: "nurse",
            element: <RoleRoute allowedRoles={["nurse"]} />,
            children: [
              { index: true, element: <PageStub title="Nurse Dashboard" /> },
              { path: "queue", element: <PageStub title="Queue" /> },
              { path: "assessments", element: <PageStub title="Assessments" /> },
            ],
          },

          /* Admin */
          {
            path: "admin",
            element: <RoleRoute allowedRoles={["admin"]} />,
            children: [
              { index: true, element: <PageStub title="Admin Dashboard" /> },
              { path: "users", element: <PageStub title="User Management" /> },
              { path: "departments", element: <PageStub title="Departments" /> },
              { path: "doctors", element: <PageStub title="Doctors" /> },
              { path: "beds", element: <PageStub title="Bed Management" /> },
              { path: "appointments", element: <PageStub title="Appointments" /> },
            ],
          },

          /* EmergencyFlow AI */
          {
            path: "emergency",
            element: <RoleRoute allowedRoles={["admin", "doctor", "nurse", "reception"]} />,
            children: [
              { index: true, element: <CommandCenter /> },
              { path: "ventilators", element: <VentilatorDashboard /> },
              { path: "incidents/new", element: <CreateIncidentPage /> },
              { path: "incidents/:id", element: <IncidentDetail /> },
              { path: "recommendations", element: <RecommendationsPage /> },
              { path: "simulator", element: <Simulator /> },
            ],
          },
        ],
      },
    ],
  },
  /* Error pages */
  { path: "/unauthorized", element: <UnauthorizedPage /> },
  { path: "*", element: <NotFoundPage /> },
]);
