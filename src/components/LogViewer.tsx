import React, { useState, useEffect } from 'react';
import { logger, LogEntry } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Trash2, RefreshCw, Filter, Eye, EyeOff } from 'lucide-react';

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (autoRefresh && isOpen) {
      const interval = setInterval(loadLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isOpen]);

  useEffect(() => {
    applyFilters();
  }, [logs, filter, levelFilter, componentFilter]);

  const loadLogs = () => {
    const storedLogs = logger.getStoredLogs();
    setLogs(storedLogs.reverse()); // Most recent first
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Text filter
    if (filter) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(filter.toLowerCase()) ||
        log.component?.toLowerCase().includes(filter.toLowerCase()) ||
        log.action?.toLowerCase().includes(filter.toLowerCase())
      );
    }

    // Level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Component filter
    if (componentFilter !== 'all') {
      filtered = filtered.filter(log => log.component === componentFilter);
    }

    setFilteredLogs(filtered);
  };

  const clearLogs = () => {
    logger.clearStoredLogs();
    setLogs([]);
    setFilteredLogs([]);
  };

  const exportLogs = () => {
    logger.exportLogs();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'bg-gray-100 text-gray-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warn': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getUniqueComponents = () => {
    const components = [...new Set(logs.map(log => log.component).filter(Boolean))];
    return components;
  };

  const getAnalytics = () => {
    return logger.getSessionAnalytics();
  };

  if (!isOpen) return null;

  const analytics = getAnalytics();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Log Viewer</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
              </Button>
              <Button variant="outline" size="sm" onClick={loadLogs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
          <Tabs defaultValue="logs" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="logs">Logs ({filteredLogs.length})</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="logs" className="flex-1 flex flex-col gap-4">
              {/* Filters */}
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Filter logs..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={componentFilter} onValueChange={setComponentFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Component" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Components</SelectItem>
                    {getUniqueComponents().map(component => (
                      <SelectItem key={component} value={component}>
                        {component}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Logs */}
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-4 space-y-2">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No logs found
                    </div>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Badge className={getLevelColor(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm text-gray-500">
                                {formatTimestamp(log.timestamp)}
                              </span>
                              {log.component && (
                                <Badge variant="outline" className="text-xs">
                                  {log.component}
                                </Badge>
                              )}
                              {log.action && (
                                <Badge variant="outline" className="text-xs">
                                  {log.action}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm font-medium mb-1">
                              {log.message}
                            </div>
                            {log.context && (
                              <details className="text-xs text-gray-600">
                                <summary className="cursor-pointer hover:text-gray-800">
                                  Context
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.context, null, 2)}
                                </pre>
                              </details>
                            )}
                            {log.stack && (
                              <details className="text-xs text-gray-600">
                                <summary className="cursor-pointer hover:text-gray-800">
                                  Stack Trace
                                </summary>
                                <pre className="mt-2 p-2 bg-red-50 rounded text-xs overflow-x-auto">
                                  {log.stack}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analytics" className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{analytics.totalLogs}</div>
                    <div className="text-sm text-gray-600">Total Logs</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{analytics.info}</div>
                    <div className="text-sm text-gray-600">Info</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-yellow-600">{analytics.warn}</div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{analytics.error}</div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </CardContent>
                </Card>
              </div>
              <div className="mt-4 space-y-2">
                <div className="text-sm">
                  <strong>Session ID:</strong> {analytics.sessionId}
                </div>
                <div className="text-sm">
                  <strong>Start Time:</strong> {analytics.startTime ? new Date(analytics.startTime).toLocaleString() : 'N/A'}
                </div>
                <div className="text-sm">
                  <strong>Last Log:</strong> {analytics.lastLog ? new Date(analytics.lastLog).toLocaleString() : 'N/A'}
                </div>
                <div className="text-sm">
                  <strong>Unique Messages:</strong> {analytics.uniqueMessages}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogViewer;
