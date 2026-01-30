import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: unknown[];
}

interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  agent_id: string;
  agent_name: string;
  contract_id: string;
  created_at: string;
  updated_at: string;
  isActive: boolean;
}

interface UseImprovedChatSessionReturn {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isLoading: boolean;
  isSaving: boolean;
  createNewSession: (agentId: string, agentName: string) => Promise<ChatSession | null>;
  switchSession: (sessionId: string) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<boolean>;
  loadAllSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  renameSession: (sessionId: string, newName: string) => Promise<boolean>;
}

export const useImprovedChatSession = (contractId: string = 'ai-agents'): UseImprovedChatSessionReturn => {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs for state management
  const saveQueueRef = useRef<Set<string>>(new Set());
  const savingRef = useRef(false);

  // Get authenticated user with retry
  const getAuthUser = useCallback(async () => {
    // Always get fresh user from Supabase to ensure consistency
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('✅ Got user from Supabase:', user.id);
      return user;
    }

    // Fallback to session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log('✅ Got user from session:', session.user.id);
      return session.user;
    }

    // Try AuthContext as last resort
    if (authUser?.id) {
      console.log('✅ Got user from AuthContext:', authUser.id);
      return authUser;
    }

    console.error('❌ No authenticated user found');
    return null;
  }, [authUser]);

  // Load all sessions for the contract
  const loadAllSessions = useCallback(async () => {
    const user = await getAuthUser();
    if (!user) {
      console.error('❌ No user found, cannot load sessions');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📚 Loading all sessions for contract:', contractId, 'User:', user.id);
      
      // First, let's check if there are any sessions at all
      const { data: allSessionsCheck, error: checkError } = await supabase
        .from('chat_sessions')
        .select('id, contract_id, user_id, name, created_at')
        .eq('user_id', user.id);
      
      console.log('🔍 All sessions for user (debugging):', allSessionsCheck);
      console.log('🔍 Sessions with contract_id = ai-agents:', allSessionsCheck?.filter(s => s.contract_id === 'ai-agents'));
      
      const { data: sessionsData, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_messages(
            id,
            role,
            content,
            metadata,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('contract_id', contractId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading sessions:', error);
        console.error('Query details:', { user_id: user.id, contract_id: contractId });
        throw error;
      }

      console.log('📊 Sessions loaded from database:', sessionsData?.length || 0);
      console.log('📊 Full sessions data:', sessionsData);

      // Convert to ChatSession format
      const loadedSessions: ChatSession[] = (sessionsData || []).map(session => ({
        id: session.id,
        name: session.name,
        agent_id: session.agent_id,
        agent_name: session.agent_id, // fallback
        contract_id: session.contract_id,
        created_at: session.created_at,
        updated_at: session.updated_at,
        isActive: false,
        messages: (session.chat_messages || [])
          .sort((a: any, b: unknown) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((msg: unknown) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
            files: msg.metadata?.files
          }))
      }));

      setSessions(loadedSessions);
      console.log(`✅ Loaded ${loadedSessions.length} sessions`);

      // If no current session but sessions exist, load the most recent
      if (!currentSession && loadedSessions.length > 0) {
        const mostRecent = loadedSessions[0];
        setCurrentSession({ ...mostRecent, isActive: true });
        console.log('📍 Set most recent session as current:', mostRecent.id);
      }

    } catch (error) {
      console.error('❌ Failed to load sessions:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar as conversas anteriores",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [contractId, currentSession, toast, getAuthUser]);

  // Save all pending messages - moved here to avoid initialization error
  const saveAllPendingMessages = useCallback(async (session: ChatSession) => {
    const user = await getAuthUser();
    if (!user || !session) return;

    console.log(`💾 Saving ${session.messages.length} messages for session ${session.id}`);

    for (const message of session.messages) {
      if (!saveQueueRef.current.has(message.id)) {
        saveQueueRef.current.add(message.id);
        
        try {
          await supabase
            .from('chat_messages')
            .upsert({
              id: message.id,
              session_id: session.id,
              role: message.role,
              content: message.content,
              metadata: message.files ? { files: message.files } : null,
              user_id: user.id,
              created_at: message.timestamp.toISOString()
            }, {
              onConflict: 'id'
            });
        } catch (error) {
          console.error('❌ Error saving message:', message.id, error);
        }
      }
    }

    // Update session timestamp
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', session.id);
  }, [getAuthUser]);

  // Create a new session
  const createNewSession = useCallback(async (agentId: string, agentName: string): Promise<ChatSession | null> => {
    const user = await getAuthUser();
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar uma conversa",
        variant: "destructive"
      });
      return null;
    }

    try {
      setIsLoading(true);
      
      // Save current session messages before creating new one
      if (currentSession && currentSession.messages.length > 0) {
        await saveAllPendingMessages(currentSession);
      }

      const sessionId = crypto.randomUUID();
      const sessionName = `${agentName} - ${new Date().toLocaleString('pt-BR')}`;

      console.log('🆕 Creating new session:', { 
        sessionId, 
        sessionName, 
        contractId,
        agentId,
        userId: user.id 
      });

      // Create in database
      const { data: createdSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          id: sessionId,
          name: sessionName,
          contract_id: contractId,
          agent_id: agentId,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating session:', error);
        throw error;
      }

      const newSession: ChatSession = {
        id: sessionId,
        name: sessionName,
        messages: [],
        agent_id: agentId,
        agent_name: agentName,
        contract_id: contractId,
        created_at: createdSession.created_at,
        updated_at: createdSession.updated_at,
        isActive: true
      };

      // Update state
      setCurrentSession(newSession);
      setSessions(prev => [newSession, ...prev]);
      
      // Save to localStorage for quick access
      localStorage.setItem(`chat_session_${contractId}`, sessionId);

      console.log('✅ New session created:', sessionId);
      toast({
        title: "Nova conversa criada",
        description: `Conversa com ${agentName} iniciada`,
      });

      return newSession;
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      toast({
        title: "Erro ao criar conversa",
        description: "Não foi possível criar uma nova conversa",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, contractId, toast, getAuthUser, saveAllPendingMessages]);

  // Switch to a different session
  const switchSession = useCallback(async (sessionId: string) => {
    const user = await getAuthUser();
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('🔄 Switching to session:', sessionId);

      // Save current session before switching
      if (currentSession) {
        await saveAllPendingMessages(currentSession);
      }

      // Load the selected session
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_messages(
            id,
            role,
            content,
            metadata,
            created_at
          )
        `)
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Session not found');
      }

      // Convert to ChatSession format
      const session: ChatSession = {
        id: sessionData.id,
        name: sessionData.name,
        agent_id: sessionData.agent_id,
        agent_name: sessionData.agent_id,
        contract_id: sessionData.contract_id,
        created_at: sessionData.created_at,
        updated_at: sessionData.updated_at,
        isActive: true,
        messages: (sessionData.chat_messages || [])
          .sort((a: any, b: unknown) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((msg: unknown) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
            files: msg.metadata?.files
          }))
      };

      setCurrentSession(session);
      localStorage.setItem(`chat_session_${contractId}`, sessionId);
      
      console.log(`✅ Switched to session: ${sessionId} with ${session.messages.length} messages`);
    } catch (error) {
      console.error('❌ Error switching session:', error);
      toast({
        title: "Erro ao carregar conversa",
        description: "Não foi possível carregar a conversa selecionada",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, contractId, toast, getAuthUser, saveAllPendingMessages]);


  // Add a message to current session
  const addMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<boolean> => {
    const user = await getAuthUser();
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para enviar mensagens",
        variant: "destructive"
      });
      return false;
    }

    // Create session if none exists
    let sessionToUse = currentSession;
    if (!sessionToUse) {
      console.log('🔄 No session, creating one...');
      sessionToUse = await createNewSession('luminos-assistant', 'Assistente Luminus');
      if (!sessionToUse) {
        return false;
      }
    }

    const messageId = crypto.randomUUID();
    const timestamp = new Date();
    const newMessage: ChatMessage = {
      ...message,
      id: messageId,
      timestamp
    };

    try {
      setIsSaving(true);
      
      // Update UI immediately
      setCurrentSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, newMessage],
          updated_at: new Date().toISOString()
        };
      });

      // Save to database
      console.log('💾 Saving message to database:', messageId);
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          id: messageId,
          session_id: sessionToUse.id,
          role: newMessage.role,
          content: newMessage.content,
          metadata: newMessage.files ? { files: newMessage.files } : null,
          user_id: user.id,
          created_at: timestamp.toISOString()
        });

      if (error) {
        console.error('❌ Error saving message:', error);
        throw error;
      }

      // Update session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionToUse.id);

      console.log('✅ Message saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save message:', error);
      toast({
        title: "Erro ao salvar mensagem",
        description: "A mensagem não pôde ser salva no histórico",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [currentSession, createNewSession, toast, getAuthUser]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    const user = await getAuthUser();
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }

      toast({
        title: "Conversa excluída",
        description: "A conversa foi removida com sucesso",
      });

      return true;
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a conversa",
        variant: "destructive"
      });
      return false;
    }
  }, [currentSession, toast, getAuthUser]);

  // Rename a session
  const renameSession = useCallback(async (sessionId: string, newName: string): Promise<boolean> => {
    const user = await getAuthUser();
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ 
          name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update state
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, name: newName } : s
      ));

      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, name: newName } : null);
      }

      toast({
        title: "Nome atualizado",
        description: "O nome da conversa foi alterado",
      });

      return true;
    } catch (error) {
      console.error('❌ Error renaming session:', error);
      toast({
        title: "Erro ao renomear",
        description: "Não foi possível alterar o nome da conversa",
        variant: "destructive"
      });
      return false;
    }
  }, [currentSession, toast, getAuthUser]);

  // Load sessions on mount
  useEffect(() => {
    loadAllSessions();
  }, [contractId, loadAllSessions]);

  // Auto-save current session periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentSession && currentSession.messages.length > 0 && !savingRef.current) {
        savingRef.current = true;
        saveAllPendingMessages(currentSession).finally(() => {
          savingRef.current = false;
        });
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [currentSession, saveAllPendingMessages]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (currentSession && currentSession.messages.length > 0) {
        saveAllPendingMessages(currentSession);
      }
    };
  }, [currentSession, saveAllPendingMessages]);

  return {
    currentSession,
    sessions,
    isLoading,
    isSaving,
    createNewSession,
    switchSession,
    addMessage,
    loadAllSessions,
    deleteSession,
    renameSession
  };
};