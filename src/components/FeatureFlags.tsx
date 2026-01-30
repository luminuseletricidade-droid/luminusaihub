import React, { createContext, useContext, useState, useEffect } from 'react';

interface FeatureFlags {
  enableRealTimeSync: boolean;
  enableAdvancedFilters: boolean;
  enablePerformanceMonitor: boolean;
  enableDataValidation: boolean;
  enableBulkOperations: boolean;
  enableExportFeatures: boolean;
  enableAIInsights: boolean;
  enableMobileOptimizations: boolean;
}

interface FeatureFlagsContextType {
  flags: FeatureFlags;
  updateFlag: (flag: keyof FeatureFlags, value: boolean) => void;
  isEnabled: (flag: keyof FeatureFlags) => boolean;
}

const defaultFlags: FeatureFlags = {
  enableRealTimeSync: true,
  enableAdvancedFilters: true,
  enablePerformanceMonitor: false,
  enableDataValidation: true,
  enableBulkOperations: false,
  enableExportFeatures: true,
  enableAIInsights: true,
  enableMobileOptimizations: true,
};

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

export const FeatureFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('luminos-feature-flags');
      if (saved) {
        try {
          return { ...defaultFlags, ...JSON.parse(saved) };
        } catch {
          return defaultFlags;
        }
      }
    }
    return defaultFlags;
  });

  const updateFlag = (flag: keyof FeatureFlags, value: boolean) => {
    setFlags(prev => {
      const newFlags = { ...prev, [flag]: value };
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('luminos-feature-flags', JSON.stringify(newFlags));
      }
      return newFlags;
    });
  };

  const isEnabled = (flag: keyof FeatureFlags): boolean => {
    return flags[flag];
  };

  useEffect(() => {
    // Save to localStorage whenever flags change
    if (typeof window !== 'undefined') {
      localStorage.setItem('luminos-feature-flags', JSON.stringify(flags));
    }
  }, [flags]);

  return (
    <FeatureFlagsContext.Provider value={{ flags, updateFlag, isEnabled }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = (): FeatureFlagsContextType => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
};

// Component para configurar flags (para desenvolvimento)
export const FeatureFlagsPanel: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const { flags, updateFlag } = useFeatureFlags();

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 bg-background border rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="font-bold mb-3">Feature Flags</h3>
      <div className="space-y-2">
        {Object.entries(flags).map(([key, value]) => (
          <label key={key} className="flex items-center justify-between text-sm">
            <span className="truncate mr-2">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </span>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateFlag(key as keyof FeatureFlags, e.target.checked)}
              className="ml-2"
            />
          </label>
        ))}
      </div>
    </div>
  );
};

export default FeatureFlagsProvider;