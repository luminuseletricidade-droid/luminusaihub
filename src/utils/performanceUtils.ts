// Performance measurement utilities

interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceTracker {
  private marks: Map<string, PerformanceMark> = new Map();
  private measurements: PerformanceMark[] = [];

  // Start a performance measurement
  start(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
    }
    
    this.marks.set(name, {
      name,
      startTime: Date.now()
    });
  }

  // End a performance measurement
  end(name: string): number | null {
    const mark = this.marks.get(name);
    if (!mark) {
      console.warn(`Performance mark "${name}" not found`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - mark.startTime;

    // Update the mark
    mark.endTime = endTime;
    mark.duration = duration;

    // Add to measurements history
    this.measurements.push({ ...mark });

    // Clean up the mark
    this.marks.delete(name);

    // Use performance API if available
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // Ignore errors in performance API
      }
    }

    return duration;
  }

  // Get measurement by name
  getMeasurement(name: string): PerformanceMark | undefined {
    return this.measurements.find(m => m.name === name);
  }

  // Get all measurements
  getAllMeasurements(): PerformanceMark[] {
    return [...this.measurements];
  }

  // Get measurements over a threshold
  getSlowMeasurements(threshold: number = 100): PerformanceMark[] {
    return this.measurements.filter(m => (m.duration || 0) > threshold);
  }

  // Clear all measurements
  clear(): void {
    this.marks.clear();
    this.measurements = [];
    
    if (typeof performance !== 'undefined' && performance.clearMarks && performance.clearMeasures) {
      try {
        performance.clearMarks();
        performance.clearMeasures();
      } catch (error) {
        // Ignore errors
      }
    }
  }

  // Get performance summary
  getSummary(): {
    totalMeasurements: number;
    averageDuration: number;
    slowestMeasurement: PerformanceMark | null;
    fastestMeasurement: PerformanceMark | null;
  } {
    const measurements = this.measurements.filter(m => m.duration !== undefined);
    
    if (measurements.length === 0) {
      return {
        totalMeasurements: 0,
        averageDuration: 0,
        slowestMeasurement: null,
        fastestMeasurement: null
      };
    }

    const durations = measurements.map(m => m.duration!);
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const averageDuration = totalDuration / durations.length;

    const slowestMeasurement = measurements.reduce((slowest, current) => 
      (current.duration! > slowest.duration!) ? current : slowest
    );

    const fastestMeasurement = measurements.reduce((fastest, current) => 
      (current.duration! < fastest.duration!) ? current : fastest
    );

    return {
      totalMeasurements: measurements.length,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowestMeasurement,
      fastestMeasurement
    };
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

// Decorator for measuring function performance
export function measurePerformance<T extends (...args: unknown[]) => any>(
  target: T,
  name?: string
): T {
  const functionName = name || target.name || 'anonymous';
  
  return ((...args: Parameters<T>) => {
    performanceTracker.start(functionName);
    try {
      const result = target(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          performanceTracker.end(functionName);
        });
      }
      
      performanceTracker.end(functionName);
      return result;
    } catch (error) {
      performanceTracker.end(functionName);
      throw error;
    }
  }) as T;
}

// Memory usage utilities
export const getMemoryUsage = () => {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as unknown).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100, // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024 * 100) / 100, // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100  // MB
    };
  }
  return null;
};

// Bundle size analysis
export const getBundleStats = () => {
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  return {
    scriptCount: scripts.length,
    styleCount: styles.length,
    totalResources: scripts.length + styles.length
  };
};

// DOM complexity analysis
export const getDOMComplexity = () => {
  const elements = document.querySelectorAll('*');
  const depth = getMaxDOMDepth(document.body);
  const listeners = getEventListenerCount();
  
  return {
    elementCount: elements.length,
    maxDepth: depth,
    estimatedListeners: listeners
  };
};

function getMaxDOMDepth(element: Element, currentDepth = 0): number {
  let maxDepth = currentDepth;
  
  for (const child of element.children) {
    const childDepth = getMaxDOMDepth(child, currentDepth + 1);
    maxDepth = Math.max(maxDepth, childDepth);
  }
  
  return maxDepth;
}

function getEventListenerCount(): number {
  // This is an estimation since we can't directly count event listeners
  const interactiveElements = document.querySelectorAll(
    'button, input, select, textarea, a, [onclick], [onmouseover], [onmouseout]'
  );
  return interactiveElements.length;
}

// Page load performance
export const getPageLoadMetrics = () => {
  if (typeof performance === 'undefined' || !performance.timing) {
    return null;
  }

  const timing = performance.timing;
  const navigationStart = timing.navigationStart;

  return {
    dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
    tcpConnect: timing.connectEnd - timing.connectStart,
    serverResponse: timing.responseStart - timing.requestStart,
    pageDownload: timing.responseEnd - timing.responseStart,
    domProcessing: timing.domComplete - timing.domLoading,
    totalLoadTime: timing.loadEventEnd - navigationStart,
    domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
    firstPaint: getFirstPaintTime(),
    firstContentfulPaint: getFirstContentfulPaintTime()
  };
};

function getFirstPaintTime(): number | null {
  if (typeof performance !== 'undefined' && performance.getEntriesByType) {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? Math.round(firstPaint.startTime) : null;
  }
  return null;
}

function getFirstContentfulPaintTime(): number | null {
  if (typeof performance !== 'undefined' && performance.getEntriesByType) {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? Math.round(firstContentfulPaint.startTime) : null;
  }
  return null;
}

export default {
  performanceTracker,
  measurePerformance,
  getMemoryUsage,
  getBundleStats,
  getDOMComplexity,
  getPageLoadMetrics
};