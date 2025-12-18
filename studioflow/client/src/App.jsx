import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkError from './pages/NetworkError';
import { ThemeColorProvider } from './components/ThemeColorProvider';
import NetworkStatusListener from './components/NetworkStatusListener';
import CookieConsent from './components/CookieConsent';
import SmartRedirect from './components/SmartRedirect';



const Landing = lazy(() => import('./pages/Landing'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const CreateProject = lazy(() => import('./pages/CreateProject'));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'));
const Pricing = lazy(() => import('./pages/Pricing'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsConditions = lazy(() => import('./pages/TermsConditions'));
const CancellationRefund = lazy(() => import('./pages/CancellationRefund'));
const ShippingDelivery = lazy(() => import('./pages/ShippingDelivery'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Projects = lazy(() => import('./pages/Projects'));
const Trash = lazy(() => import('./pages/Trash'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const CreateInvoicePage = lazy(() => import('./pages/CreateInvoicePage'));
const ProjectFilesPage = lazy(() => import('./pages/ProjectFilesPage'));
const SharedFilePage = lazy(() => import('./pages/SharedFilePage'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Settings = lazy(() => import('./pages/Settings'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const Features = lazy(() => import('./pages/Features'));
const ClientPortal = lazy(() => import('./pages/features/ClientPortal'));
const Invoicing = lazy(() => import('./pages/features/Invoicing'));
const Compare = lazy(() => import('./pages/Compare'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const ProjectStoryboard = lazy(() => import('./pages/ProjectStoryboard'));
const ShowcaseLandingPage = lazy(() => import('./pages/ShowcaseLandingPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const AllFiles = lazy(() => import('./pages/AllFiles'));
// Marketing / Phase 6.3
const BlogPage = lazy(() => import('./pages/marketing/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/marketing/BlogPostPage'));
const CreatorProfilePage = lazy(() => import('./pages/public/CreatorProfilePage'));
const WriteBlogPage = lazy(() => import('./pages/marketing/WriteBlogPage'));
// Widget is lazy loaded to avoid bundle impact if flag is off
const FeedbackWidget = lazy(() => import('./components/marketing/FeedbackWidget'));

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
import { SocketProvider } from './context/SocketContext';
import { usePushToken } from './hooks/usePushToken';
import { useReviewFeatureFlag } from './context/FeatureFlagContext';
import { onMessageListener } from './lib/firebase';
import { useEffect } from 'react';

function App() {
  // console.log('App mounting...');

  // Initialize push notifications
  const { requestPermission } = usePushToken();

  useEffect(() => {
    // Listen for foreground messages
    const unsubscribe = onMessageListener().then(payload => {
      if (payload) {
        console.log('Foreground push received:', payload);
        toast(payload.notification.title, {
          description: payload.notification.body,
        });
      }
    });
    return () => unsubscribe;
  }, []);

  const enableMarketing = import.meta.env.VITE_ENABLE_MARKETING_TOOLS === 'true';

  return (
    <ErrorBoundary>
      <ThemeColorProvider defaultThemeColor="green" storageKey="vite-ui-theme-color">
        <UploadProvider>
          <SocketProvider>
            <Router>
              <NetworkStatusListener />
              <Toaster position="top-right" richColors closeButton />
              <CookieConsent />
              <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading...</div>}>
                <Routes>
                  {/* ... routes ... */}
                  <Route path="/" element={
                    <SmartRedirect>
                      <Landing />
                    </SmartRedirect>
                  } />
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
                  {/* Public Showcase Landing Page */}
                  <Route path="/showcase/:slug" element={<ShowcaseLandingPage />} />
                  <Route path="/p/:username" element={<PortfolioPage />} />

                  {/* Marketing / Blog */}
                  {enableMarketing && (
                    <>
                      <Route path="/blog" element={<BlogPage />} />
                      <Route path="/blog/:slug" element={<BlogPostPage />} />
                      <Route path="/u/:username" element={<CreatorProfilePage />} />
                      <Route path="/write" element={
                        <ProtectedRoute>
                          <WriteBlogPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/write/:slug" element={
                        <ProtectedRoute>
                          <WriteBlogPage />
                        </ProtectedRoute>
                      } />
                      {/* /changelog could go here too */}
                    </>
                  )}

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
                    <Route path="files" element={<AllFiles />} />
                    {useReviewFeatureFlag().features?.storyboard && (
                      <Route path="projects/:projectId/storyboard" element={<ProjectStoryboard />} />
                    )}
                    <Route path="analytics" element={<AnalyticsDashboard />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                {/* Global Marketing Widgets */}
                {/* {enableMarketing && <FeedbackWidget />} */}
              </Suspense>
            </Router>
          </SocketProvider>
        </UploadProvider>
      </ThemeColorProvider>
    </ErrorBoundary>
  );
}

export default App;
