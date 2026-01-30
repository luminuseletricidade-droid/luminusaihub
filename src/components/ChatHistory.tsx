import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface ChatSession {
  id: string;
  name: string;
  contract_id: string | null;
  agent_id: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface ChatHistoryProps {
  contractNumber: string;
  onSelectSession: (sessionId: string) => void;
  currentSessionId?: string;
  onNewSession: () => void;
}

const ChatHistory = ({ contractNumber, onSelectSession, currentSessionId, onNewSession }: ChatHistoryProps) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadChatSessions = useCallback(async () => {
    if (!contractNumber) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 Loading chat sessions for contract:', contractNumber);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar sessões da tabela chat_sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          name,
          contract_id,
          agent_id,
          created_at,
          updated_at
        `)
        .eq('contract_id', contractNumber)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError);
        throw sessionsError;
      }

      console.log('📝 Found sessions:', sessionsData?.length || 0);

      // Para cada sessão, contar as mensagens
      const sessionsWithCount = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          return {
            ...session,
            message_count: count || 0
          };
        })
      );

      // Filtrar apenas sessões com mensagens
      const validSessions = sessionsWithCount.filter(session => session.message_count > 0);
      
      console.log('✅ Valid sessions with messages:', validSessions.length);
      setSessions(validSessions);
    } catch (error) {
      console.error('❌ Error loading chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contractNumber]);

  useEffect(() => {
    loadChatSessions();
  }, [loadChatSessions]);

  const handleRenameSession = async (sessionId: string, newName: string) => {
    try {
      // Atualizar nome da sessão na tabela chat_sessions
      const { error } = await supabase
        .from('chat_sessions')
        .update({ name: newName })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, name: newName }
          : session
      ));

      setEditingSession(null);
      setEditName('');

      toast({
        title: "Sessão renomeada",
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
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Deletar mensagens da sessão
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      if (messagesError) throw messagesError;

      // Deletar a sessão
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // Recarregar sessões
      await loadChatSessions();
      
      toast({
        title: "Conversa removida",
        description: "A conversa foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a conversa.",
        variant: "destructive"
      });
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Histórico de Conversas</h3>
          <Button size="sm" variant="ghost" onClick={onNewSession}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Carregando histórico...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma conversa ainda
            </div>
          ) : (
            sessions.map((session) => (
              <Card 
                key={session.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  currentSessionId === session.id ? 'bg-muted border-primary' : ''
                }`}
                onClick={() => !editingSession && onSelectSession(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingSession === session.id ? (
                      <div className="flex items-center space-x-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-6 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameSession(session.id, editName);
                            } else if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameSession(session.id, editName);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEdit();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-medium text-sm truncate">{session.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {session.message_count || 0} mensagens
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.updated_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {editingSession !== session.id && (
                    <div className="flex space-x-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(session);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-60 hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Tem certeza que deseja remover esta conversa?')) {
                            handleDeleteSession(session.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatHistory;