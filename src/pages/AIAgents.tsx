import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Bot, 
  Send, 
  User, 
  Upload, 
  FileText, 
  Calendar, 
  BookOpen, 
  BarChart3, 
  FileBarChart, 
  Sparkles, 
  MessageCircle, 
  PaperclipIcon,
  X,
  ChevronDown,
  Paperclip,
  Loader2,
  History,
  Plus,
  Save,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ChatFileUpload from '@/components/ChatFileUpload';
import { ModernChatHistory } from '@/components/ModernChatHistory';
import { OptimizedPDFAnalyzer } from '@/components/OptimizedPDFAnalyzer';
import { FormattedMessage } from '@/components/FormattedMessage';
import { cn } from '@/lib/utils';
import { useMobileViewport } from '@/lib/mobile';
import { useImprovedChatSession } from '@/hooks/useImprovedChatSession';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
}

interface UploadedFile {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
}

interface ContextData {
  contracts?: unknown[];
  maintenances?: unknown[];
  metrics?: unknown;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: unknown;
  color: string;
  bgGradient: string;
  specialties: string[];
  examples: string[];
}

const agents: Agent[] = [
  {
    id: 'general-conversation',
    name: 'Conversa Geral',
    description: 'Assistente inteligente para todas as suas necessidades',
    icon: MessageCircle,
    color: 'text-blue-600',
    bgGradient: 'from-blue-500 to-blue-600',
    specialties: ['Análise de Documentos', 'Assistência Geral', 'Processamento de Dados'],
    examples: [
      "Analise este documento para mim",
      "Ajude-me a entender este contrato",
      "Preciso de informações sobre este arquivo"
    ]
  }
];

const AIAgents = () => {
  const { toast } = useToast();
  const location = useLocation();
  const { isMobile } = useMobileViewport();
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[0]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyKey, setHistoryKey] = useState(0); // Force refresh of history
  const [hasProcessedInitialPrompt, setHasProcessedInitialPrompt] = useState(false);
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Usar o hook melhorado de sessão de chat
  const {
    currentSession,
    sessions,
    isLoading: sessionLoading,
    isSaving,
    createNewSession,
    switchSession,
    addMessage,
    loadAllSessions,
    deleteSession,
    renameSession
  } = useImprovedChatSession('ai-agents');

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [inputMessage]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current && currentSession?.messages) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [currentSession?.messages]);

  useEffect(() => {
    const state = location.state as { initialPrompt?: string; agentId?: string } | null;
    if (state?.agentId) {
      const targetAgent = agents.find(agent => agent.id === state.agentId);
      if (targetAgent) {
        setSelectedAgent(targetAgent);
      }
    }
  }, [location.state]);

  // Load sessions when component mounts with delay for auth
  useEffect(() => {
    // Wait a bit for authentication to be ready
    const timer = setTimeout(() => {
      console.log('🔄 [AIAgents] Loading sessions after auth delay...');
      loadAllSessions();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [loadAllSessions]);

  // Process initial prompt from navigation state
  useEffect(() => {
    const state = location.state as { initialPrompt?: string; agentId?: string; contextData?: ContextData } | null;
    if (state?.initialPrompt && !hasProcessedInitialPrompt) {
      setInputMessage(state.initialPrompt);
      setHasProcessedInitialPrompt(true);

      // Store context data if provided
      if (state?.contextData) {
        console.log('📊 Context data received from navigation:', state.contextData);
        setContextData(state.contextData);
      }

      // Auto-send the message after a short delay to ensure session is ready
      setTimeout(() => {
        const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
        if (sendButton) {
          sendButton.click();
        }
      }, 500);
    }
  }, [location.state, hasProcessedInitialPrompt, selectedAgent]);

  // Simplified send message function
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage;
    const messageFiles = [...uploadedFiles];
    
    // Clear input immediately
    setInputMessage('');
    setUploadedFiles([]);

    try {
      setIsLoading(true);

      // Ensure we have a session or create one automatically
      let sessionToUse = currentSession;
      if (!sessionToUse) {
        console.log('🔄 No session found, creating new session...');
        sessionToUse = await createNewSession(selectedAgent.id, selectedAgent.name);
        if (!sessionToUse) {
          throw new Error('Não foi possível criar nova sessão');
        }
      }

      // Add user message
      console.log('📝 Adding user message...');
      const messageAdded = await addMessage({
        role: 'user',
        content: messageText,
        files: messageFiles.length > 0 ? messageFiles : undefined
      });

      if (!messageAdded) {
        throw new Error('Não foi possível salvar mensagem');
      }

      // Prepare files for API (remove File objects, keep only serializable data)
      const apiFiles = messageFiles.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        content: f.content || ''
      }));

      // DEBUG: Log file details
      console.log('🔍 [DEBUG] Arquivos sendo enviados para API:', {
        count: apiFiles.length,
        files: apiFiles.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size,
          hasContent: !!f.content,
          contentLength: f.content?.length || 0,
          contentPreview: f.content?.substring(0, 50) + '...'
        }))
      });

      // Call AI service
      console.log('🚀 Calling smart-chat service with:', {
        message: messageText,
        agent_id: selectedAgent.id,
        files_count: apiFiles.length,
        session_id: sessionToUse.id
      });
      
      const { data, error } = await supabase.functions.invoke('smart-chat', {
        body: {
          message: messageText,
          agent_id: selectedAgent.id,
          uploaded_files: apiFiles.length > 0 ? apiFiles : undefined,
          session_id: sessionToUse.id,
          maintain_context: true,
          context_data: contextData || undefined
        }
      });

      if (error) {
        console.error('❌ Smart-chat error:', error);
        console.error('❌ Error details:', { 
          message: error.message,
          status: (error as unknown).status,
          context: (error as unknown).context 
        });
        throw new Error(error.message || 'Erro na comunicação com o serviço');
      }

      if (data && data.response) {
        // Add AI response
        console.log('🤖 Adding AI response...');
        await addMessage({
          role: 'assistant',
          content: data.response
        });

        // Show success feedback only for file processing
        if (messageFiles.length > 0) {
          toast({
            title: "Arquivos processados",
            description: `${messageFiles.length} arquivo(s) foram analisados com sucesso.`,
          });
        }

        console.log('✅ Message flow completed successfully');
      } else {
        throw new Error('Resposta inválida do servidor');
      }

    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      
      let errorMessage = "Não foi possível enviar a mensagem. Tente novamente.";
      let assistantMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('timeout') || errorMsg.includes('abort')) {
          errorMessage = "A resposta está demorando mais que o esperado. Aguarde alguns segundos e tente novamente.";
          assistantMessage = 'O processamento está demorando mais que o esperado. Isso pode acontecer com documentos grandes ou consultas complexas. Tente aguardar um momento e enviar novamente sua mensagem.';
        } else if (errorMsg.includes('quota') || errorMsg.includes('rate')) {
          errorMessage = "Limite de uso temporariamente excedido. Aguarde alguns minutos e tente novamente.";
          assistantMessage = 'Nosso serviço está temporariamente sobrecarregado. Aguarde alguns minutos e tente novamente.';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorMessage = "Problema de conexão. Verifique sua internet e tente novamente.";
          assistantMessage = 'Houve um problema de conexão. Verifique sua internet e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro na comunicação",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Add error message
      await addMessage({
        role: 'assistant',
        content: assistantMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = (files: UploadedFile[]) => {
    // Check max files limit
    if (uploadedFiles.length + files.length > 5) {
      toast({
        title: "Limite de arquivos",
        description: "Você pode anexar no máximo 5 arquivos por vez.",
        variant: "destructive"
      });
      return;
    }
    
    setUploadedFiles(prev => [...prev, ...files]);
    setShowFileUpload(false);
  };

  const handleFileButtonClick = () => {
    // Create hidden input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg';
    
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const files = Array.from(target.files || []);
      
      if (files.length === 0) return;
      
      // Check file size limit (10MB per file)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
      
      if (oversizedFiles.length > 0) {
        toast({
          title: "Arquivo muito grande",
          description: `Os seguintes arquivos excedem o limite de 10MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      
      // Convert to UploadedFile format
      const uploadedFiles: UploadedFile[] = await Promise.all(files.map(async (file) => {
        // Convert file to base64 for smaller files
        let content = '';
        if (file.size < 1024 * 1024) { // Less than 1MB
          content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
        
        return {
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          content: content,
          file: file
        } as UploadedFile;
      }));
      
      handleFileUpload(uploadedFiles);
    };
    
    input.click();
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleAgentChange = async (agent: Agent) => {
    setSelectedAgent(agent);
    setUploadedFiles([]);
    setShowAgentSelector(false);
    setContextData(null); // Clear context when changing agent

    // Create new session for the new agent
    await createNewSession(agent.id, agent.name);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  // Selecionar uma sessão do histórico
  const handleSelectSession = async (sessionId: string) => {
    await switchSession(sessionId);
    setShowHistory(false);
    setHistoryKey(prev => prev + 1); // Force refresh history
  };

  // Iniciar nova conversa
  const handleNewSession = async () => {
    await createNewSession(selectedAgent.id, selectedAgent.name);
    setUploadedFiles([]);
    setContextData(null); // Clear context on new session
    setShowHistory(false);
    setHistoryKey(prev => prev + 1); // Force refresh history
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto p-4 gap-4">
      {/* Header com seletor de agente */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-background to-muted/30">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className={cn(
                "p-3 rounded-xl bg-gradient-to-br text-white shadow-lg",
                selectedAgent.bgGradient
              )}>
                <selectedAgent.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                    {selectedAgent.name}
                  </h1>
                  {isSaving && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Save className="h-3 w-3 animate-pulse" />
                      <span>Salvando...</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedAgent.description}
                </p>
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              {/* Botão Nova Conversa minimalista */}
              <Button
                onClick={handleNewSession}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-primary/10"
                title="Nova Conversa"
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              {/* Botão de histórico */}
              <Sheet open={showHistory} onOpenChange={(open) => {
                setShowHistory(open);
                if (open) {
                  // Force refresh when opening and reload sessions
                  setHistoryKey(prev => prev + 1);
                  loadAllSessions();
                  console.log('📂 Opening history, forcing reload of sessions');
                }
              }}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <History className="h-4 w-4" />
                      {!isMobile && <span>Histórico</span>}
                    </Button>
                  </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
                  <SheetHeader>
                    <SheetTitle>Histórico de Conversas</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-hidden mt-4">
                    {showHistory && (
                      <ModernChatHistory
                        key={historyKey}
                        contractNumber="ai-agents"
                        onSelectSession={handleSelectSession}
                        currentSessionId={currentSession?.id}
                        onNewSession={handleNewSession}
                        onDeleteSession={deleteSession}
                        onRenameSession={renameSession}
                        sessions={sessions}
                      />
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Agente único - sem seletor */}
            </div>
          </div>
          
          {/* Especialidades */}
          <div className="flex flex-wrap gap-2 mt-4">
            {selectedAgent.specialties.map((specialty) => (
              <Badge key={specialty} variant="secondary" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>

          {/* Informações da sessão atual */}
          {currentSession && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <MessageCircle className="h-3 w-3" />
              <span>{currentSession.name}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{currentSession.messages.length} mensagens</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Área principal de chat */}
      <Card className="flex-1 flex flex-col border-none shadow-sm">
        <ScrollArea className="flex-1 p-4 sm:p-6" ref={scrollAreaRef}>
          <div className="space-y-6">
            {selectedAgent.id === 'pdf-analyzer' ? (
              <OptimizedPDFAnalyzer />
            ) : !currentSession?.messages.length ? (
              <div className="text-center py-12">
                <div className={cn(
                  "w-20 h-20 rounded-2xl bg-gradient-to-br mx-auto mb-6 flex items-center justify-center text-white shadow-lg",
                  selectedAgent.bgGradient
                )}>
                  <selectedAgent.icon className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Olá! Sou o {selectedAgent.name}
                </h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {selectedAgent.description}. Como posso ajudá-lo hoje?
                </p>
                
                {/* Sugestões de perguntas */}
                <div className="space-y-3 max-w-lg mx-auto">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Experimente perguntar:
                  </h4>
                  <div className="grid gap-2">
                    {selectedAgent.examples.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="text-left h-auto p-3 hover:bg-muted/50"
                        onClick={() => handleSuggestionClick(example)}
                      >
                        <MessageCircle className="h-4 w-4 mr-3 flex-shrink-0" />
                        <span className="text-sm">{example}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              currentSession.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className={cn(
                      "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0",
                      selectedAgent.bgGradient
                    )}>
                      <selectedAgent.icon className="h-4 w-4" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[85%] sm:max-w-[75%]",
                    message.role === 'user' ? 'order-first' : ''
                  )}>
                    <Card className={cn(
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50'
                    )}>
                      <CardContent className="p-4">
                        {message.role === 'assistant' ? (
                          <FormattedMessage content={message.content} />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        )}
                        {message.files && message.files.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-current/20">
                            <div className="flex items-center gap-2 text-xs opacity-70">
                              <PaperclipIcon className="h-3 w-3" />
                              <span>{message.files.length} arquivo(s) anexado(s)</span>
                            </div>
                          </div>
                        )}
                        <p className="text-xs opacity-60 mt-3">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className={cn(
                  "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white",
                  selectedAgent.bgGradient
                )}>
                  <selectedAgent.icon className="h-4 w-4" />
                </div>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]"></div>
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">Pensando...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Arquivos anexados */}
        {uploadedFiles.length > 0 && (
          <div className="p-4 bg-muted/20">
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 text-sm"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-auto w-auto p-1"
                    onClick={() => handleRemoveFile(file.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input de mensagem */}
        <div className="p-4 sm:p-6 border-t border-border/60 bg-card/95 backdrop-blur-sm">
          <div className="max-w-full mx-auto space-y-3">
            {/* Input Row */}
            <div className="flex gap-2 sm:gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  disabled={isLoading}
                  className="min-h-[60px] max-h-[200px] resize-none border-border/40 bg-background/50 focus:bg-background transition-colors text-sm sm:text-base pr-12"
                  rows={1}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFileButtonClick}
                  className="absolute right-2 bottom-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Anexar arquivos (máx. 5 arquivos, 10MB cada)"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="h-12 w-12 p-0 bg-primary hover:bg-primary/90 flex-shrink-0 rounded-full"
                data-send-button
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-xs text-muted-foreground text-center">
              Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> para enviar • 
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift+Enter</kbd> para quebra de linha
              {isSaving && (
                <span className="ml-2 text-amber-600">
                  • Salvando conversa...
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIAgents;
