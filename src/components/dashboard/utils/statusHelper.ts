import type { MaintenanceTask, Status, BacklogTask } from '../types';

/**
 * Parses a date string in DD/MM/YY format into a Date object.
 * @param dateStr The date string to parse.
 * @returns A Date object or null if the string is invalid.
 */
export const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // month is 0-indexed in JS Date
    let year = parseInt(parts[2], 10);

    if (year < 100) {
        year += 2000;
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return null;
    }

    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
    }

    return date;
};

/**
 * Extracts all valid, non-null dates from a task's various date fields.
 * @param task The maintenance task.
 * @returns An array of Date objects.
 */
export const getAllTaskDates = (task: MaintenanceTask): Date[] => {
    // Prioriza o array maintenances (dados reais do banco)
    if (task.maintenances && task.maintenances.length > 0) {
        return task.maintenances
            .map(m => parseDate(m.date))
            .filter((d): d is Date => d !== null);
    }

    // Fallback para o campo maintenanceDate
    if (task.maintenanceDate) {
        const parsed = parseDate(task.maintenanceDate);
        if (parsed) return [parsed];
    }

    // Fallback para campos legados
    return [
        parseDate(task.monthlyMaintenanceDate),
        parseDate(task['250hMaintenanceDate']),
        parseDate(task.tankCleaningDate),
        parseDate(task.alternatorMeggerDate),
        parseDate(task.radiatorMeggerDate),
        parseDate(task.radiatorCleaningDate),
        parseDate(task.valveRegulationDate),
        parseDate(task['500hMaintenanceDate']),
        parseDate(task.batteryDate),
    ].filter((d): d is Date => d !== null);
};


/**
 * Gathers all non-null status values from a single task object.
 * @param task The maintenance task.
 * @returns An array of all valid statuses for the task.
 */
export const getTaskStatuses = (task: MaintenanceTask): Exclude<Status, null>[] => {
    // Prioriza o array maintenances (dados reais do banco)
    if (task.maintenances && task.maintenances.length > 0) {
        return task.maintenances
            .map(m => m.status)
            .filter((s): s is Exclude<Status, null> => s !== null && s !== undefined);
    }

    // Fallback para o campo maintenanceStatus
    if (task.maintenanceStatus) {
        return [task.maintenanceStatus];
    }

    // Fallback para campos legados
    return [
        task.monthlyMaintenanceStatus,
        task['250hMaintenanceStatus'],
        task.tankCleaningStatus,
        task.alternatorMeggerStatus,
        task.radiatorMeggerStatus,
        task.radiatorCleaningStatus,
        task.valveRegulationStatus,
        task['500hMaintenanceStatus'],
        task.batteryStatus,
    ].filter((s): s is Exclude<Status, null> => s !== null && s !== undefined);
};

/**
 * Calculates the overall status of a task based on the priority of its individual maintenance statuses.
 * The priority is: Late > Planned > On Schedule.
 * @param task The maintenance task.
 * @returns The single, most critical status for the task.
 */
export const getOverallStatus = (task: MaintenanceTask): Status => {
    const statuses = getTaskStatuses(task);

    if (statuses.some(s => s === 'EM ATRASO')) {
        return 'EM ATRASO';
    }
    if (statuses.some(s => s === 'EM ANDAMENTO')) {
        return 'EM ANDAMENTO';
    }
    if (statuses.some(s => s === 'PROGRAMADO')) {
        return 'PROGRAMADO';
    }
    if (statuses.some(s => s === 'PENDENTE')) {
        return 'PENDENTE';
    }
    if (statuses.some(s => s === 'EM DIA')) {
        return 'EM DIA';
    }
    // Return null if there are no valid statuses to evaluate
    return null;
};

// ==============================================
// HELPER FUNCTIONS FOR BACKLOG REPORTS
// ==============================================

/**
 * Maps database status to application Status type for backlog reports.
 * @param dbStatus The status from the database.
 * @param scheduledDate The scheduled date for date-based status inference.
 * @returns The mapped Status value.
 */
export const mapBacklogDbStatusToAppStatus = (dbStatus: string | null, scheduledDate: string | null): Status => {
    if (!dbStatus) return 'PENDENTE';

    const normalizedStatus = dbStatus.toLowerCase().trim();

    // Helper to check if date has passed
    const isDatePast = (date: string | null): boolean => {
        if (!date) return false;
        const dateOnly = date.split('T')[0];
        const scheduledDateTime = new Date(dateOnly + 'T09:00:00');
        return scheduledDateTime < new Date();
    };

    switch (normalizedStatus) {
        case 'overdue':
        case 'atrasada':
        case 'atrasado':
            return 'EM ATRASO';

        case 'completed':
        case 'concluída':
        case 'concluida':
        case 'concluído':
        case 'concluido':
            return 'EM DIA';

        case 'in_progress':
        case 'in-progress':
        case 'em andamento':
        case 'em_andamento':
            return 'EM ANDAMENTO';

        case 'scheduled':
        case 'agendada':
        case 'agendado':
            return isDatePast(scheduledDate) ? 'EM ATRASO' : 'PENDENTE';

        case 'pending':
        case 'pendente':
            return isDatePast(scheduledDate) ? 'EM ATRASO' : 'PENDENTE';

        case 'confirmed':
        case 'confirmada':
        case 'confirmado':
            return 'PROGRAMADO';

        case 'cancelled':
        case 'cancelada':
        case 'cancelado':
            return 'PROGRAMADO';

        default:
            return isDatePast(scheduledDate) ? 'EM ATRASO' : 'PENDENTE';
    }
};

/**
 * Gets the color class for a backlog status.
 * @param status The status value.
 * @returns Tailwind CSS classes for the status color.
 */
export const getBacklogStatusColor = (status: Status): string => {
    switch (status) {
        case 'EM DIA':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        case 'EM ATRASO':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        case 'EM ANDAMENTO':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        case 'PROGRAMADO':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
        case 'PENDENTE':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
};

/**
 * Gets the progress bar color based on progress percentage.
 * @param progress The progress percentage (0-100).
 * @returns Tailwind CSS class for the progress bar color.
 */
export const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
};

/**
 * Gets the urgency level based on days open and reschedule count.
 * @param daysOpen Number of days the task has been open.
 * @param rescheduleCount Number of times the task was rescheduled.
 * @returns Urgency level: 'critical', 'high', 'medium', 'low'.
 */
export const getBacklogUrgency = (daysOpen: number, rescheduleCount: number): 'critical' | 'high' | 'medium' | 'low' => {
    if (daysOpen > 60 && rescheduleCount >= 3) return 'critical';
    if (daysOpen > 30 && rescheduleCount >= 2) return 'high';
    if (daysOpen > 30 || rescheduleCount >= 2) return 'medium';
    return 'low';
};

/**
 * Gets the urgency color based on urgency level.
 * @param urgency The urgency level.
 * @returns Tailwind CSS classes for the urgency color.
 */
export const getUrgencyColor = (urgency: 'critical' | 'high' | 'medium' | 'low'): string => {
    switch (urgency) {
        case 'critical':
            return 'border-red-500 bg-red-50 dark:bg-red-950/20';
        case 'high':
            return 'border-orange-500 bg-orange-50 dark:bg-orange-950/20';
        case 'medium':
            return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
        case 'low':
            return 'border-green-500 bg-green-50 dark:bg-green-950/20';
    }
};

/**
 * Formats a date string for display.
 * @param dateStr ISO date string or null.
 * @returns Formatted date string (DD/MM/YYYY) or '-'.
 */
export const formatBacklogDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    } catch {
        return '-';
    }
};

/**
 * Calculates the deviation between planned and actual progress for Curva S.
 * @param planned Planned percentage.
 * @param actual Actual percentage.
 * @returns Object with deviation value and status.
 */
export const calculateCurvaSDeviation = (planned: number, actual: number): { value: number; status: 'ahead' | 'on_track' | 'behind' } => {
    const deviation = actual - planned;

    if (deviation >= 5) return { value: deviation, status: 'ahead' };
    if (deviation >= -5) return { value: deviation, status: 'on_track' };
    return { value: deviation, status: 'behind' };
};
