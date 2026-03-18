import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import BugListPage from "./pages/BugListPage";
import BugDetailsPage from "./pages/BugDetailsPage";
import CreateBugPage from "./pages/CreateBugPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import MyWorkPage from "./pages/MyWorkPage";
import NotificationsPage from "./pages/NotificationsPage";
import ActivityPage from "./pages/ActivityPage";
import TeamPage from "./pages/TeamPage";
import CapabilitiesPage from "./pages/CapabilitiesPage";
import PreviewPage from "./pages/PreviewPage";
import PricingPage from "./pages/PricingPage";
import DocsPage from "./pages/DocsPage";
import SupportPage from "./pages/SupportPage";
import ValidationPage from "./pages/ValidationPage";
import ContactPage from "./pages/ContactPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import { useAuth } from "./context/AuthContext";
import { hasPermission, PERMISSIONS } from "./utils/roles";

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ permission, children }) {
  const { user } = useAuth();
  if (!hasPermission(user, permission)) {
    return <AccessDeniedPage />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/capabilities" element={<CapabilitiesPage />} />
      <Route path="/preview" element={<PreviewPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/validation" element={<ValidationPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="bugs" element={<BugListPage />} />
        <Route path="bugs/new" element={<CreateBugPage />} />
        <Route path="bugs/:id" element={<BugDetailsPage />} />
        <Route path="my-work" element={<MyWorkPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="activity"
          element={(
            <RoleRoute permission={PERMISSIONS.ACTIVITY}>
              <ActivityPage />
            </RoleRoute>
          )}
        />
        <Route
          path="team"
          element={(
            <RoleRoute permission={PERMISSIONS.TEAM}>
              <TeamPage />
            </RoleRoute>
          )}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
