// Utilitário de traduções para padronizar textos em português

// Traduções para status de manutenção
export const statusTranslations = {
  // Status principais (novo fluxo)
  'pending': 'Pendente',
  'scheduled': 'Agendada',
  'confirmed': 'Confirmada',
  'in_progress': 'Em Andamento',
  'completed': 'Concluída',
  'cancelled': 'Cancelada',
  'overdue': 'Atrasada',

  // Status gerais
  'active': 'Ativo',
  'inactive': 'Inativo',

  // Variações possíveis e compatibilidade
  'in progress': 'Em Andamento',
  'in-progress': 'Em Andamento',
  'agendada': 'Agendada',
  'agendado': 'Agendada',
  'confirmada': 'Confirmada',
  'confirmado': 'Confirmada',
  'concluída': 'Concluída',
  'concluído': 'Concluída',
  'cancelada': 'Cancelada',
  'cancelado': 'Cancelada',
  'atrasada': 'Atrasada',
  'atrasado': 'Atrasada',
} as const;

// Traduções para prioridades
export const priorityTranslations = {
  'low': 'Baixa',
  'medium': 'Média',
  'high': 'Alta',
  'critical': 'Crítica',
  'urgent': 'Urgente',
} as const;

// Traduções para tipos de manutenção
export const typeTranslations = {
  'preventive': 'Preventiva',
  'corrective': 'Corretiva',
  'predictive': 'Preditiva',
  'emergency': 'Emergência',
  'routine': 'Rotineira',
  'preventiva': 'Preventiva',
  'corretiva': 'Corretiva',
  'preditiva': 'Preditiva',
} as const;

// Traduções para status de contratos
export const contractStatusTranslations = {
  'active': 'Ativo',
  'inactive': 'Inativo',
  'expired': 'Expirado',
  'pending': 'Pendente',
  'draft': 'Rascunho',
  'cancelled': 'Cancelado',
  'suspended': 'Suspenso',
} as const;

// Função utilitária para traduzir status
export function translateStatus(status: string): string {
  if (!status) return '';
  const lowerStatus = status.toLowerCase();
  return statusTranslations[lowerStatus as keyof typeof statusTranslations] || status;
}

// Função utilitária para traduzir prioridade
export function translatePriority(priority: string): string {
  if (!priority) return '';
  const lowerPriority = priority.toLowerCase();
  return priorityTranslations[lowerPriority as keyof typeof priorityTranslations] || priority;
}

// Função utilitária para traduzir tipo
export function translateType(type: string): string {
  if (!type) return '';
  const lowerType = type.toLowerCase();
  return typeTranslations[lowerType as keyof typeof typeTranslations] || type;
}

// Função utilitária para traduzir status de contrato
export function translateContractStatus(status: string): string {
  if (!status) return '';
  const lowerStatus = status.toLowerCase();
  return contractStatusTranslations[lowerStatus as keyof typeof contractStatusTranslations] || status;
}

// Traduções para mensagens gerais do sistema
export const systemTranslations = {
  'loading': 'Carregando...',
  'error': 'Erro',
  'success': 'Sucesso',
  'warning': 'Atenção',
  'info': 'Informação',
  'save': 'Salvar',
  'cancel': 'Cancelar',
  'delete': 'Excluir',
  'edit': 'Editar',
  'create': 'Criar',
  'update': 'Atualizar',
  'search': 'Buscar',
  'filter': 'Filtrar',
  'export': 'Exportar',
  'import': 'Importar',
  'print': 'Imprimir',
  'download': 'Baixar',
  'upload': 'Enviar',
  'view': 'Visualizar',
  'back': 'Voltar',
  'next': 'Próximo',
  'previous': 'Anterior',
  'refresh': 'Atualizar',
  'clear': 'Limpar',
  'reset': 'Resetar',
  'close': 'Fechar',
  'open': 'Abrir',
  'show': 'Mostrar',
  'hide': 'Ocultar',
} as const;

// Função utilitária para traduzir texto geral
export function translate(key: string): string {
  const lowerKey = key.toLowerCase();
  return systemTranslations[lowerKey as keyof typeof systemTranslations] || key;
}