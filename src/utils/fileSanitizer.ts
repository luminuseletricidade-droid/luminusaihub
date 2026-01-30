
export const sanitizeFileName = (fileName: string): string => {
  // Remove a extensão para processar separadamente
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  
  // Sanitizar o nome do arquivo
  let sanitized = name
    // Normalizar caracteres unicode (remover acentos)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Converter para minúsculo
    .toLowerCase()
    // Substituir espaços e caracteres especiais por underscores
    .replace(/[^a-z0-9]/g, '_')
    // Remover underscores múltiplos
    .replace(/_+/g, '_')
    // Remover underscores do início e fim
    .replace(/^_|_$/g, '')
    // Limitar tamanho (deixar espaço para timestamp)
    .substring(0, 50);
  
  // Se o nome ficou vazio, usar fallback
  if (!sanitized) {
    sanitized = 'documento';
  }
  
  // Adicionar timestamp para evitar conflitos
  const timestamp = Date.now();
  
  // Sanitizar extensão também
  const cleanExtension = extension.toLowerCase().replace(/[^a-z0-9.]/g, '');
  
  return `${sanitized}_${timestamp}${cleanExtension}`;
};

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Verificar tipo
  const allowedTypes = ['application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Apenas arquivos PDF são permitidos' };
  }
  
  // Verificar se o arquivo não está vazio
  if (file.size === 0) {
    return { isValid: false, error: 'Arquivo está vazio' };
  }
  
  return { isValid: true };
};
