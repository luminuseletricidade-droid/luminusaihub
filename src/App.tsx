
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SecurityProvider } from "@/components/SecurityProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ResponsiveLayout } from "./components/ResponsiveLayout";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
// import LoadingSpinner from "./components/common/LoadingSpinner";
import { Loader2 } from "lucide-react";
import { setupFetchInterceptor } from "@/utils/apiErrorHandler";

// Eager load critical pages
import Index from "./pages/Index";
import EnhancedAuth from "./components/EnhancedAuth";

// Lazy load secondary pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Clients = lazy(() => import("./pages/Clients"));
const Maintenances = lazy(() => import("./pages/Maintenances"));
const Reports = lazy(() => import("./pages/Reports"));
const BacklogReports = lazy(() => import("./pages/BacklogReports"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Cronogramas = lazy(() => import("./pages/Cronogramas"));
const Upload = lazy(() => import("./pages/Upload"));
const AIAgents = lazy(() => import("./pages/AIAgents"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Settings pages
const Regions = lazy(() => import("./pages/settings/Regions"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AccessDenied = lazy(() => import("./pages/AccessDenied"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Initialize error interceptor
if (typeof window !== 'undefined') {
  setupFetchInterceptor();
}

const App = () => {
  useEffect(() => {
    // Setup global error handling for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);

      // Check for specific error patterns
      if (event.reason?.message?.includes('404') ||
          event.reason?.message?.includes('Not Found')) {
        // Handle 404 errors gracefully
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      <NetworkStatusBanner />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <SecurityProvider>
              <Toaster />
            <BrowserRouter>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<EnhancedAuth />} />
              <Route path="/app" element={
                <ProtectedRoute>
                  <ResponsiveLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <Dashboard />
                  </Suspense>
                } />
                <Route path="contracts" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <Contracts />
                  </Suspense>
                } />
                <Route path="clients" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <Clients />
                  </Suspense>
                } />
                <Route path="maintenances" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <Maintenances />
                  </Suspense>
                } />
                <Route path="cronogramas" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <Cronogramas />
                  </Suspense>
                } />
                <Route path="reports" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <Reports />
                  </Suspense>
                } />
                <Route path="reports/backlogs" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <BacklogReports />
                  </Suspense>
                } />
                <Route path="calendar" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <Calendar />
                  </Suspense>
                } />
                <Route path="ai-agents" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <AIAgents />
                  </Suspense>
                } />
                <Route path="profile" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <Profile />
                  </Suspense>
                } />
                {/* Settings routes */}
                <Route path="settings/regions" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <Regions />
                  </Suspense>
                } />
                <Route path="admin">
                  <Route index element={
                    <AdminRoute>
                      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <AdminDashboard />
                      </Suspense>
                    </AdminRoute>
                  } />
                  <Route path="users" element={
                    <AdminRoute>
                      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <AdminUsers />
                      </Suspense>
                    </AdminRoute>
                  } />
                  <Route path="settings" element={
                    <AdminRoute>
                      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <AdminSettings />
                      </Suspense>
                    </AdminRoute>
                  } />
                  <Route path="logs" element={
                    <AdminRoute>
                      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <AdminLogs />
                      </Suspense>
                    </AdminRoute>
                  } />
                </Route>
              </Route>
              {/* Access Denied page */}
              <Route path="/access-denied" element={
                <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                  <AccessDenied />
                </Suspense>
              } />
              {/* Legacy admin routes - redirect to app/admin */}
              <Route path="/admin" element={<Navigate to="/app/admin" replace />} />
              <Route path="/admin-login" element={<Navigate to="/app/admin" replace />} />
              <Route path="/admin/dashboard" element={<Navigate to="/app/admin" replace />} />
              <Route path="/admin/users" element={<Navigate to="/app/admin/users" replace />} />
              <Route path="/admin/settings" element={<Navigate to="/app/admin/settings" replace />} />
              <Route path="/admin/logs" element={<Navigate to="/app/admin/logs" replace />} />
              <Route path="*" element={
                <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                  <NotFound />
                </Suspense>
              } />
            </Routes>
          </BrowserRouter>
          </SecurityProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </>
  );
};

export default App;
