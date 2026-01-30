import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, BarChart3, Download, Trash2 } from 'lucide-react';
import LogViewer from '@/components/LogViewer';
import { logger } from '@/lib/logger';
import { isDebugEnabled, getLogLevel, isLogToConsoleEnabled } from '@/lib/env';

const DebugPanel: React.FC = () => {
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [analytics, setAnalytics] = useState(logger.getSessionAnalytics());

  const refreshAnalytics = () => {
    setAnalytics(logger.getSessionAnalytics());
  };

  const exportLogs = () => {
    logger.exportLogs();
  };

  const clearLogs = () => {
    logger.clearStoredLogs();
    refreshAnalytics();
  };

  const testLogging = () => {
    logger.debug('Test debug message', { test: true }, 'DEBUG_PANEL', 'test');
    logger.info('Test info message', { test: true }, 'DEBUG_PANEL', 'test');
    logger.warn('Test warning message', { test: true }, 'DEBUG_PANEL', 'test');
    logger.error('Test error message', { test: true }, 'DEBUG_PANEL', 'test');
    refreshAnalytics();
  };

  // Only show in development or when debug is enabled
  if (!isDebugEnabled()) {
    return null;
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Logging Configuration</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Level:</span>
                  <Badge variant="outline">{getLogLevel()}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Console:</span>
                  <Badge variant={isLogToConsoleEnabled() ? "default" : "secondary"}>
                    {isLogToConsoleEnabled() ? 'ON' : 'OFF'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Session Analytics</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Total:</span>
                  <Badge variant="outline">{analytics.totalLogs}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Errors:</span>
                  <Badge variant={analytics.error > 0 ? "destructive" : "outline"}>
                    {analytics.error}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLogViewerOpen(true)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Logs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={testLogging}
            >
              <Bug className="h-4 w-4 mr-2" />
              Test Logging
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Logs
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{analytics.info}</div>
              <div className="text-xs text-gray-600">Info</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{analytics.warn}</div>
              <div className="text-xs text-gray-600">Warn</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{analytics.error}</div>
              <div className="text-xs text-gray-600">Error</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-600">{analytics.debug}</div>
              <div className="text-xs text-gray-600">Debug</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <LogViewer
        isOpen={isLogViewerOpen}
        onClose={() => setIsLogViewerOpen(false)}
      />
    </>
  );
};

export default DebugPanel;
