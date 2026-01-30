
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MessageSquare, Edit2, Trash2, Check, X, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday, startOfWeek, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface ChatSession {
  id: string;
  name: string;
  contract_id: string | null;
  agent_id: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface ModernChatHistoryProps {
  contractNumber: string;
  onSelectSession: (sessionId: string) => void;
  currentSessionId?: string;
  onNewSession: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newName: string) => void;
  sessions?: unknown[]; // Optional sessions prop for external data
  onClose?: () => void; // Function to close history view
}

export function ModernChatHistory({
  contractNumber,
  onSelectSession,
  currentSessionId,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  sessions: externalSessions,
  onClose
}: ModernChatHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const loadChatSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // First check AuthContext user (same as other components)
      let user = authUser;
      
      if (!user) {
        console.log('⏳ ModernChatHistory: AuthContext user not ready, trying Supabase...');
        
        // Try getUser first for fresh data with retry
        let retries = 0;
        const maxRetries = 3;
        
        while (!user && retries < maxRetries) {
          const { data: { user: freshUser } } = await supabase.auth.getUser();
          if (freshUser) {
            user = freshUser;
            console.log('✅ ModernChatHistory got fresh user:', user.id, 'on attempt', retries + 1);
            break;
          }
          
          // Fallback to session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            user = session.user;
            console.log('✅ ModernChatHistory got user from session:', user.id, 'on attempt', retries + 1);
            break;
          }
          
          retries++;
          if (retries < maxRetries) {
            console.log(`⏳ ModernChatHistory waiting for auth, attempt ${retries}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } else {
        console.log('✅ ModernChatHistory using AuthContext user:', user.id);
      }
      
      if (!user) {
        console.log('❌ No user found in ModernChatHistory after all attempts');
        return;
      }
      
      console.log('🔍 ModernChatHistory loading sessions for:', {
        contractNumber,
        userId: user.id
      });

      // Load sessions with message count
      // For AI Agents page, look for sessions with contract_id = 'ai-agents'
      // For contract pages, filter by the specific contract_id
      const { data: sessionsData, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_messages(id)
        `)
        .eq('user_id', user.id)
        .eq('contract_id', contractNumber)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error in ModernChatHistory:', error);
        throw error;
      }
      
      console.log('✅ ModernChatHistory loaded sessions:', {
        count: sessionsData?.length || 0,
        sessions: sessionsData,
        contractNumber,
        timestamp: new Date().toISOString()
      });

      // Process sessions with message count
      const processedSessions = sessionsData?.map(session => ({
        ...session,
        message_count: session.chat_messages?.length || 0
      })) || [];

      setSessions(processedSessions);
      console.log('📋 Final processed sessions set:', processedSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de conversas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [contractNumber, authUser, toast]);

  useEffect(() => {
    // Use external sessions if provided, otherwise load from database
    if (externalSessions && externalSessions.length > 0) {
      console.log('📚 Using external sessions:', externalSessions);
      setSessions(externalSessions.map(s => ({
        ...s,
        message_count: s.messages?.length || s.chat_messages?.length || 0
      })));
      setIsLoading(false);
    } else if (authUser) {
      // Only load if authUser is available
      console.log('🔄 ModernChatHistory: AuthContext user ready, loading sessions...');
      loadChatSessions();
    } else {
      console.log('⏳ ModernChatHistory: Waiting for AuthContext user...');
    }
  }, [contractNumber, externalSessions, authUser, loadChatSessions]);

  const handleRenameSession = async (sessionId: string, newName: string) => {
    if (onRenameSession) {
      // Use the prop function if provided
      await onRenameSession(sessionId, newName.trim() || 'Nova Conversa');
      setEditingSession(null);
      setEditName('');
      loadChatSessions(); // Reload to get updated data
    } else {
      // Fallback to local implementation
      try {
        const user = authUser || (await supabase.auth.getUser()).data.user;
        if (!user) {
          console.error('❌ No user for rename operation');
          return;
        }
        console.log('📝 Renaming session', sessionId, 'for user', user.id);

        const { error } = await supabase
          .from('chat_sessions')
          .update({ 
            name: newName.trim() || 'Nova Conversa', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', sessionId)
          .eq('user_id', user.id);

        if (error) throw error;

        setSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, name: newName.trim() || 'Nova Conversa' }
            : session
        ));

        setEditingSession(null);
        setEditName('');

        toast({
          title: "Conversa renomeada",
          description: "Nome da conversa atualizado com sucesso.",
        });
      } catch (error) {
        console.error('Error renaming session:', error);
        toast({
          title: "Erro ao renomear",
          description: "Não foi possível renomear a conversa.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (onDeleteSession) {
      // Use the prop function if provided
      await onDeleteSession(sessionId);
      loadChatSessions(); // Reload to get updated data
    } else {
      // Fallback to local implementation
      try {
        const user = authUser || (await supabase.auth.getUser()).data.user;
        if (!user) {
          console.error('❌ No user for delete operation');
          return;
        }
        console.log('🗑️ Deleting session', sessionId, 'for user', user.id);

        const { error } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', sessionId)
          .eq('user_id', user.id);

        if (error) throw error;

        setSessions(prev => prev.filter(session => session.id !== sessionId));

        toast({
          title: "Conversa excluída",
          description: "Conversa removida com sucesso.",
        });

        if (currentSessionId === sessionId) {
          onNewSession();
        }
      } catch (error) {
        console.error('Error deleting session:', error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir a conversa.",
          variant: "destructive"
        });
      }
    }
  };

  const startEdit = (session: ChatSession) => {
    setEditingSession(session.id);
    setEditName(session.name);
  };

  const cancelEdit = () => {
    setEditingSession(null);
    setEditName('');
  };

  const formatSessionDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return 'Hoje';
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE', { locale: ptBR });
    } else {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  console.log('🗺 ModernChatHistory render state:', {
    isLoading,
    totalSessions: sessions.length,
    filteredSessions: filteredSessions.length,
    contractNumber,
    searchQuery
  });

  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const groupKey = formatSessionDate(session.created_at);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  return (
    <div className="flex flex-col h-full max-h-full bg-gradient-to-b from-card/50 to-card/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Conversas</h3>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-background/60"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button 
          onClick={onNewSession}
          className="w-full mb-4 bg-primary hover:bg-primary/90 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conversa
        </Button>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50 border-border/40"
          />
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-3">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">Nenhuma conversa encontrada para este contrato</p>
              <p className="text-xs">Inicie uma nova conversa para criar seu primeiro histórico</p>
              <p className="text-xs mt-2 opacity-60">Contract ID: {contractNumber}</p>
            </div>
          ) : (
            Object.entries(groupedSessions).map(([dateGroup, dateSessions]) => (
              <div key={dateGroup} className="mb-6">
                <div className="sticky top-0 bg-card/80 backdrop-blur-sm px-3 py-2 mb-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {dateGroup}
                    </h4>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {dateSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 border border-transparent ${
                        currentSessionId === session.id 
                          ? 'bg-primary/10 border-primary/20 shadow-sm' 
                          : 'hover:border-border/40'
                      }`}
                      onClick={() => !editingSession ? onSelectSession(session.id) : undefined}
                    >
                      {editingSession === session.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm bg-background/50"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameSession(session.id, editName);
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRenameSession(session.id, editName)}
                            className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">
                                {session.name}
                              </h4>
                              {session.message_count && session.message_count > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-muted/50">
                                    {session.message_count} mensagens
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(session);
                                }}
                                className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(session.id);
                                }}
                                className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                
                {Object.keys(groupedSessions).indexOf(dateGroup) < Object.keys(groupedSessions).length - 1 && (
                  <Separator className="mt-4 bg-border/30" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
