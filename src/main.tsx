import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import GlobalErrorBoundary from './components/GlobalErrorBoundary.tsx';
import { AuthProvider } from "@/contexts/AuthContext"
import { OptimizedQueryProvider } from "@/contexts/OptimizedQueryProvider"
import { SecurityProvider } from "@/components/SecurityProvider"
import { EnhancedSecurityProvider } from "@/components/EnhancedSecurityProvider"
import './index.css';

// Performance monitoring
if (typeof window !== 'undefined') {
  // Track initial page load performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData) {
        console.log('Page Load Performance:', {
          'Total Load Time': `${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`,
          'DOM Content Loaded': `${Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart)}ms`,
          'First Paint': performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 'N/A',
        });
      }
    }, 0);
  });
}

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <OptimizedQueryProvider>
      <SecurityProvider>
        <EnhancedSecurityProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </EnhancedSecurityProvider>
      </SecurityProvider>
    </OptimizedQueryProvider>
  </GlobalErrorBoundary>
);
