import React, { useState } from 'react';
import type { BacklogTask, Status } from './types';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Hourglass,
  Play,
  Calendar,
  RefreshCw,
  FileText,
  Edit3,
  Save,
  X,
  Lightbulb
} from 'lucide-react';
import {
  getBacklogStatusColor,
  getProgressColor,
  getBacklogUrgency,
  getUrgencyColor,
  formatBacklogDate
} from './utils/statusHelper';
import { cn } from '@/lib/utils';

interface BacklogTaskCardProps {
  task: BacklogTask;
  onUpdateRecommendation?: (taskId: string, recommendation: string) => Promise<void>;
  onRegenerateRecommendation?: (taskId: string) => Promise<void>;
}

const StatusBadge: React.FC<{ status: Status | null }> = ({ status }) => {
  if (!status) {
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">N/D</span>;
  }

  const statusStyles: Record<Exclude<Status, null>, string> = {
    'EM DIA': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'EM ATRASO': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    'EM ANDAMENTO': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'PROGRAMADO': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    'PENDENTE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  };

  const statusIcons: Record<Exclude<Status, null>, React.ReactNode> = {
    'EM DIA': <CheckCircle className="h-3 w-3" />,
    'EM ATRASO': <AlertTriangle className="h-3 w-3" />,
    'EM ANDAMENTO': <Play className="h-3 w-3" />,
    'PROGRAMADO': <Clock className="h-3 w-3" />,
    'PENDENTE': <Hourglass className="h-3 w-3" />,
  };

  return (
    <span className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${statusStyles[status]}`}>
      {statusIcons[status]}
      {status}
    </span>
  );
};

const BacklogTaskCard: React.FC<BacklogTaskCardProps> = ({
  task,
  onUpdateRecommendation,
  onRegenerateRecommendation
}) => {
  const [isEditingRecommendation, setIsEditingRecommendation] = useState(false);
  const [editedRecommendation, setEditedRecommendation] = useState(task.recommendation || '');
  const [isSaving, setIsSaving] = useState(false);

  const urgency = getBacklogUrgency(task.daysOpen, task.rescheduleCount);
  const urgencyColor = getUrgencyColor(urgency);
  const progressColor = getProgressColor(task.progress);

  const handleSaveRecommendation = async () => {
    if (!onUpdateRecommendation) return;
    setIsSaving(true);
    try {
      await onUpdateRecommendation(task.id, editedRecommendation);
      setIsEditingRecommendation(false);
    } catch (error) {
      console.error('Erro ao salvar recomendação:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateRecommendation = async () => {
    if (!onRegenerateRecommendation) return;
    setIsSaving(true);
    try {
      await onRegenerateRecommendation(task.id);
    } catch (error) {
      console.error('Erro ao regenerar recomendação:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedRecommendation(task.recommendation || '');
    setIsEditingRecommendation(false);
  };

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border-l-4",
      urgencyColor
    )}>
      {/* Header */}
      <div className="bg-gray-800 dark:bg-gray-900 text-white p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold truncate">{task.client}</h3>
            <p className="text-xs text-gray-300 mt-0.5">{task.code}</p>
          </div>
          <div className="flex-shrink-0 ml-2">
            <StatusBadge status={task.status} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-300">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{task.type}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{task.technician || 'Não atribuído'}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Days Open */}
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className={cn(
              "text-2xl font-bold",
              task.daysOpen > 30 ? "text-red-600 dark:text-red-400" :
              task.daysOpen > 7 ? "text-yellow-600 dark:text-yellow-400" :
              "text-green-600 dark:text-green-400"
            )}>
              {task.daysOpen}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Dias em Aberto</div>
          </div>

          {/* Reschedule Count */}
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className={cn(
              "text-2xl font-bold flex items-center justify-center gap-1",
              task.rescheduleCount >= 3 ? "text-red-600 dark:text-red-400" :
              task.rescheduleCount >= 1 ? "text-yellow-600 dark:text-yellow-400" :
              "text-green-600 dark:text-green-400"
            )}>
              <RefreshCw className="h-4 w-4" />
              {task.rescheduleCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Reprogramações</div>
          </div>

          {/* Progress */}
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
              {task.progress}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Progresso</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Progresso</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={cn("h-2 rounded-full transition-all duration-300", progressColor)}
              style={{ width: `${Math.min(task.progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>Agendada: {formatBacklogDate(task.scheduledDate)}</span>
          </div>
          {task.completedDate && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>Concluída: {formatBacklogDate(task.completedDate)}</span>
            </div>
          )}
        </div>

        {/* Critical Badge */}
        {task.isCriticalBacklog && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Backlog Crítico - Atraso superior a 30 dias
            </span>
          </div>
        )}

        {/* Recommendation Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Recomendação
            </div>
            <div className="flex items-center gap-1">
              {!isEditingRecommendation && onRegenerateRecommendation && (
                <button
                  onClick={handleRegenerateRecommendation}
                  disabled={isSaving}
                  className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="Regenerar recomendação automática"
                >
                  <RefreshCw className={cn("h-4 w-4", isSaving && "animate-spin")} />
                </button>
              )}
              {!isEditingRecommendation && onUpdateRecommendation && (
                <button
                  onClick={() => setIsEditingRecommendation(true)}
                  className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="Editar recomendação"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {isEditingRecommendation ? (
            <div className="space-y-2">
              <textarea
                value={editedRecommendation}
                onChange={(e) => setEditedRecommendation(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Digite a recomendação..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 inline mr-1" />
                  Cancelar
                </button>
                <button
                  onClick={handleSaveRecommendation}
                  disabled={isSaving}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4 inline mr-1" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <p className={cn(
              "text-sm",
              task.recommendation
                ? "text-gray-600 dark:text-gray-300"
                : "text-gray-400 dark:text-gray-500 italic"
            )}>
              {task.recommendation || 'Nenhuma recomendação definida'}
            </p>
          )}
        </div>

        {/* Notes */}
        {task.notes && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              <FileText className="h-4 w-4" />
              Observações
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{task.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacklogTaskCard;
