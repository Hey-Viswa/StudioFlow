import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import Landing from './pages/Landing';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import AcceptInvite from './pages/AcceptInvite';
import Pricing from './pages/Pricing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import CancellationRefund from './pages/CancellationRefund';
import ShippingDelivery from './pages/ShippingDelivery';
import ContactUs from './pages/ContactUs';
import Projects from './pages/Projects';
import Trash from './pages/Trash';
import Invoices from './pages/Invoices';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/dashboard" />
      </SignedOut>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/invite" element={<AcceptInvite />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/cancellation-refund" element={<CancellationRefund />} />
          <Route path="/shipping-delivery" element={<ShippingDelivery />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/contact-us" element={<ContactUs />} /> {/* Alias for footer links */}
          
          {/* Dashboard with nested routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<CreateProject />} />
            <Route path="projects/:projectId" element={<ProjectDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="subscription" element={<Subscription />} />
            <Route path="settings" element={<Settings />} />
            <Route path="trash" element={<Trash />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Analytics />
        <SpeedInsights />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
