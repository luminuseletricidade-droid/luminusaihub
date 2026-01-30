import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentContextIndicatorProps {
  documents: Array<{
    id: string;
    name: string;
    status: 'loading' | 'ready' | 'error';
    pages?: number;
  }>;
  isProcessing: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export const DocumentContextIndicator: React.FC<DocumentContextIndicatorProps> = ({
  documents,
  isProcessing,
  expanded = false,
  onToggleExpand
}) => {
  if (!documents || documents.length === 0) return null;

  const readyCount = documents.filter(d => d.status === 'ready').length;
  const loadingCount = documents.filter(d => d.status === 'loading').length;
  const errorCount = documents.filter(d => d.status === 'error').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'loading':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'loading':
        return 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-2">
      {/* Main indicator bar */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
        <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-blue-900">
            📚 Contexto de Documentos
          </div>
          <div className="text-xs text-blue-700 mt-0.5">
            {readyCount} pronto{readyCount !== 1 ? 's' : ''}
            {loadingCount > 0 && ` • ${loadingCount} carregando`}
            {errorCount > 0 && ` • ${errorCount} erro${errorCount !== 1 ? 's' : ''}`}
          </div>
        </div>
        {documents.length > 1 && onToggleExpand && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="h-6 w-6 p-0 flex-shrink-0"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Expanded document list */}
      {expanded && (
        <div className="space-y-1.5 pl-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className={`flex items-center gap-2 p-2 rounded border ${getStatusBadgeColor(doc.status)}`}
            >
              {getStatusIcon(doc.status)}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{doc.name}</div>
                {doc.pages && (
                  <div className="text-xs opacity-75">{doc.pages} páginas</div>
                )}
              </div>
              <div className="text-xs font-medium flex-shrink-0">
                {doc.status === 'ready' && '✓'}
                {doc.status === 'loading' && '...'}
                {doc.status === 'error' && '✗'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="text-xs font-medium text-amber-700">
            🤖 IA consultando documentos...
          </span>
        </div>
      )}
    </div>
  );
};

export default DocumentContextIndicator;
