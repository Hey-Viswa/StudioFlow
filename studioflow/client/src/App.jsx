import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkError from './pages/NetworkError';
import Landing from './pages/Landing';
import DashboardLayout from './components/DashboardLayout';
import { ThemeColorProvider } from './components/ThemeColorProvider';
import NetworkStatusListener from './components/NetworkStatusListener';
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
import InvoicesPage from './pages/InvoicesPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import ProjectFilesPage from './pages/ProjectFilesPage';
import SharedFilePage from './pages/SharedFilePage';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
import ClientDashboard from './pages/ClientDashboard';
import NotificationsPage from './pages/NotificationsPage';

import Features from './pages/Features';
import ClientPortal from './pages/features/ClientPortal';
import Invoicing from './pages/features/Invoicing';
import Compare from './pages/Compare';

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

import { UploadProvider } from './context/UploadContext';

function App() {
  console.log('App mounting...');
  return (
    <ErrorBoundary>
      <ThemeColorProvider defaultThemeColor="green" storageKey="vite-ui-theme-color">
        <UploadProvider>
          <Router>
            <NetworkStatusListener />
            <Toaster position="top-right" richColors closeButton />
            <Routes>
              {/* ... routes ... */}
              <Route path="/" element={<Landing />} />
              <Route path="/invite" element={<AcceptInvite />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
              <Route path="/cancellation-refund" element={<CancellationRefund />} />
              <Route path="/shipping-delivery" element={<ShippingDelivery />} />

              {/* SEO Pages */}
              <Route path="/features" element={<Features />} />
              <Route path="/features/client-portal" element={<ClientPortal />} />
              <Route path="/features/invoicing" element={<Invoicing />} />
              <Route path="/compare" element={<Compare />} />

              <Route path="/contact" element={<ContactUs />} />
              <Route path="/contact-us" element={<ContactUs />} /> {/* Alias for footer links */}
              <Route path="/network-error" element={<NetworkError />} />

              {/* Shared Files - Protected Route */}
              <Route
                path="/shared/files/:shareToken"
                element={
                  <ProtectedRoute>
                    <SharedFilePage />
                  </ProtectedRoute>
                }
              />

              {/* Dashboard with nested routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ClientDashboard />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/new" element={<CreateProject />} />
                <Route path="projects/:projectId" element={<ProjectDetail />} />
                <Route path="projects/:projectId/files" element={<ProjectFilesPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="invoices/new" element={<CreateInvoicePage />} />
                <Route path="subscription" element={<Subscription />} />
                <Route path="settings" element={<Settings />} />
                <Route path="trash" element={<Trash />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Analytics />
            <SpeedInsights />
          </Router>
        </UploadProvider>
      </ThemeColorProvider>
    </ErrorBoundary>
  );
}

export default App;
