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

export const useChatSession = (contractId: string = 'ai-agents') => {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Control flags and refs
  const isInitializedRef = useRef(false);
  const lastSyncTimestampRef = useRef(0);
  const sessionCreationRef = useRef<Promise<ChatSession | null> | null>(null);

  // Enhanced authentication validation with retry mechanism
  const validateAuth = useCallback(async (maxRetries = 3) => {
    console.log('🔐 [ChatSession] Validando autenticação...');
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Always check supabase.auth session first for the most current state
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn(`⚠️ [ChatSession] Erro de sessão tentativa ${i + 1}:`, sessionError.message);
          if (i < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        if (session?.user) {
          console.log('✅ [ChatSession] Autenticação confirmada via sessão Supabase:', session.user.email, 'ID:', session.user.id);
          return session.user;
        }
        
        // Fallback check AuthContext
        if (authUser && authUser.id) {
          console.log('✅ [ChatSession] Autenticação confirmada via AuthContext:', authUser.email, 'ID:', authUser.id);
          return authUser;
        }
        
        // If first attempt, log waiting message
        if (i === 0) {
          console.log('⏳ [ChatSession] Aguardando estabelecimento da sessão...');
        }
        
        if (i < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ [ChatSession] Erro na validação tentativa ${i + 1}:`, error);
        if (i < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.error('❌ [ChatSession] Falha na validação da autenticação após', maxRetries, 'tentativas');
    toast({
      title: "Problema de autenticação",
      description: "Não foi possível validar sua sessão. Recarregue a página.",
      variant: "destructive"
    });
    return null;
  }, [authUser, toast]);

  // Generate storage key for user
  const generateStorageKey = useCallback(() => {
    return `luminos_chat_session_${contractId}`;
  }, [contractId]);

  // Save session to localStorage with better structure
  const saveSessionToStorage = useCallback((session: ChatSession) => {
    if (!session?.id) return;
    
    try {
      const storageData = {
        sessionId: session.id,
        agentId: session.agent_id,
        agentName: session.agent_name,
        messages: session.messages,
        lastActivity: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      const storageKey = generateStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(storageData));
      lastSyncTimestampRef.current = storageData.timestamp;
      
      console.log('💾 Session saved to localStorage:', session.id);
    } catch (error) {
      console.error('Error saving session to localStorage:', error);
    }
  }, [generateStorageKey]);

  // Load session from localStorage
  const loadSessionFromStorage = useCallback(() => {
    try {
      const storageKey = generateStorageKey();
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check if data is recent (within 7 days)
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        const isRecent = data.timestamp && (Date.now() - data.timestamp) < maxAge;
        
        if (isRecent && data.sessionId) {
          return {
            sessionId: data.sessionId,
            agentId: data.agentId || 'luminos-assistant',
            agentName: data.agentName || 'Assistente Luminus',
            messages: data.messages || [],
            lastActivity: data.lastActivity,
            timestamp: data.timestamp
          };
        }
      }
    } catch (error) {
      console.error('Error loading session from localStorage:', error);
    }
    
    return null;
  }, [generateStorageKey]);

  // Create new session - save current session first if it has messages
  const forceNewSession = useCallback(async (agentId: string, agentName: string): Promise<ChatSession | null> => {
    const user = await validateAuth();
    if (!user) {
      console.error('❌ [ChatSession] Usuário não autenticado para nova sessão');
      return null;
    }

    // Prevent concurrent session creation
    if (sessionCreationRef.current) {
      return await sessionCreationRef.current;
    }

    sessionCreationRef.current = (async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Creating NEW session for agent:', agentId, 'User ID:', user.id);

        // **CRITICAL FIX**: Save current session messages if it exists and has messages
        if (currentSession && currentSession.messages.length > 0) {
          console.log('💾 Saving current session with', currentSession.messages.length, 'messages before creating new one...');
          
          // First ensure the session exists in database
          const { data: existingSession, error: sessionCheckError } = await supabase
            .from('chat_sessions')
            .select('id')
            .eq('id', currentSession.id)
            .eq('user_id', user.id)
            .single();

          if (sessionCheckError || !existingSession) {
            console.log('🔄 Current session does not exist in database, creating it first...');
            const { error: createCurrentSessionError } = await supabase
              .from('chat_sessions')
              .insert({
                id: currentSession.id,
                name: currentSession.name,
                contract_id: currentSession.contract_id,
                agent_id: currentSession.agent_id,
                user_id: user.id,
                created_at: currentSession.created_at,
                updated_at: new Date().toISOString()
              });

            if (createCurrentSessionError) {
              console.error('❌ Failed to create current session:', createCurrentSessionError);
            } else {
              console.log('✅ Current session created in database');
            }
          }
          
          // Save all messages
          for (const message of currentSession.messages) {
            try {
              const { error: messageError } = await supabase
                .from('chat_messages')
                .upsert({
                  id: message.id,
                  session_id: currentSession.id,
                  role: message.role,
                  content: message.content,
                  metadata: message.files ? { files: message.files } : null,
                  user_id: user.id,
                  created_at: message.timestamp.toISOString()
                }, {
                  onConflict: 'id'
                });

              if (messageError) {
                console.error('❌ Error saving message:', message.id, messageError);
              } else {
                console.log('✅ Message saved:', message.id);
              }
            } catch (msgError) {
              console.error('❌ Message save error:', msgError);
            }
          }

          // Update session timestamp
          await supabase
            .from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentSession.id);
              
          console.log('✅ Current session saved to database before creating new one');
        }

        const sessionName = `Chat ${agentName} - ${new Date().toLocaleString('pt-BR')}`;
        const newSessionId = crypto.randomUUID();
        
        // Create session in database with explicit logging
        console.log('💾 Creating new session in database:', {
          id: newSessionId,
          name: sessionName,
          contract_id: contractId,
          agent_id: agentId,
          user_id: user.id
        });

        const { data: createdSession, error } = await supabase
          .from('chat_sessions')
          .insert({
            id: newSessionId,
            name: sessionName,
            contract_id: contractId,
            agent_id: agentId,
            user_id: user.id
          })
          .select('*')
          .single();

        if (error) {
          console.error('❌ Database error creating session:', {
            error: error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        if (!createdSession) {
          throw new Error('Sessão criada mas não retornada pela database');
        }

        console.log('✅ Session created in database successfully:', {
          id: createdSession.id,
          name: createdSession.name,
          contract_id: createdSession.contract_id,
          user_id: createdSession.user_id
        });

        // Create session object
        const newSession: ChatSession = {
          id: newSessionId,
          name: sessionName,
          messages: [],
          agent_id: agentId,
          agent_name: agentName,
          contract_id: contractId,
          created_at: createdSession.created_at,
          updated_at: createdSession.updated_at,
          isActive: true
        };

        // Update state and storage immediately
        setCurrentSession(newSession);
        saveSessionToStorage(newSession);
        
        console.log('✅ NEW session created and stored:', newSessionId);
        return newSession;
      } catch (error) {
        console.error('❌ Error creating session:', error);
        toast({
          title: "Erro ao criar sessão",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive"
        });
        return null;
      } finally {
        setIsLoading(false);
        sessionCreationRef.current = null;
      }
    })();

    return await sessionCreationRef.current;
  }, [validateAuth, contractId, toast, saveSessionToStorage, currentSession]);

  // Load session from database - moved here to avoid initialization error
  const loadSessionFromDatabase = useCallback(async (sessionId: string): Promise<ChatSession | null> => {
    const user = await validateAuth();
    if (!user) {
      console.error('❌ [ChatSession] Usuário não autenticado para carregar da database');
      return null;
    }

    try {
      console.log('🔄 Loading session from database:', sessionId);

      // Load session metadata - use maybeSingle() to handle cases where no session exists
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          name,
          agent_id,
          contract_id,
          created_at,
          updated_at
        `)
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (sessionError) {
        console.error('❌ [ChatSession] Error loading session metadata:', sessionError);
        return null;
      }

      if (!sessionData) {
        console.log('⚠️ [ChatSession] Session not found in database:', sessionId);
        return null;
      }

      // Load messages for this session
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          role,
          content,
          metadata,
          created_at
        `)
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('❌ [ChatSession] Error loading messages:', messagesError);
        return null;
      }

      // Convert to ChatSession format
      const session: ChatSession = {
        id: sessionData.id,
        name: sessionData.name,
        agent_id: sessionData.agent_id,
        agent_name: sessionData.agent_id, // Use agent_id as name for now
        contract_id: sessionData.contract_id,
        created_at: sessionData.created_at,
        updated_at: sessionData.updated_at,
        isActive: true,
        messages: (messagesData || []).map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          files: msg.metadata?.files || []
        }))
      };

      console.log('✅ [ChatSession] Session loaded with', session.messages.length, 'messages');
      setCurrentSession(session);
      saveSessionToStorage(session);
      
      return session;

    } catch (error) {
      console.error('❌ [ChatSession] Error loading session from database:', error);
      return null;
    }
  }, [validateAuth, saveSessionToStorage]);

  // Get or maintain existing session - with robust auto-creation
  const getOrMaintainSession = useCallback(async (agentId: string, agentName: string): Promise<ChatSession | null> => {
    const user = await validateAuth();
    if (!user) {
      console.error('❌ [ChatSession] Usuário não autenticado para manter sessão');
      return null;
    }

    // If there's already a current session and it's active, use it
    if (currentSession?.isActive) {
      if (currentSession.agent_id !== agentId) {
        // Update agent but keep session
        const updatedSession = {
          ...currentSession,
          agent_id: agentId,
          agent_name: agentName,
          updated_at: new Date().toISOString()
        };
        setCurrentSession(updatedSession);
        saveSessionToStorage(updatedSession);
        console.log('🔄 Agent updated in existing session:', agentId);
      }
      return currentSession;
    }

    // Try to restore from localStorage first
    const storedData = loadSessionFromStorage();
    if (storedData?.sessionId) {
      console.log('🔄 Found stored session, attempting to restore:', storedData.sessionId);
      
      try {
        const restoredSession = await loadSessionFromDatabase(storedData.sessionId);
        if (restoredSession) {
          // Update agent if needed
          if (restoredSession.agent_id !== agentId) {
            restoredSession.agent_id = agentId;
            restoredSession.agent_name = agentName;
            
            // Update in database too
            await supabase
              .from('chat_sessions')
              .update({ agent_id: agentId, updated_at: new Date().toISOString() })
              .eq('id', restoredSession.id);
              
            saveSessionToStorage(restoredSession);
          }
          console.log('✅ Session restored successfully:', restoredSession.id);
          return restoredSession;
        }
      } catch (error) {
        console.error('❌ Error restoring session:', error);
        // Clear invalid storage
        localStorage.removeItem(generateStorageKey());
      }
    }

    // No valid session found - auto-create one to maintain continuity
    console.log('🔄 No valid session found, auto-creating session for continuity...');
    return await forceNewSession(agentId, agentName);
  }, [validateAuth, currentSession, loadSessionFromStorage, saveSessionToStorage, forceNewSession, generateStorageKey, loadSessionFromDatabase]);

  // Add message with automatic session creation and robust saving
  const addMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<boolean> => {
    let sessionToUse = currentSession;
    
    // Auto-create session if none exists
    if (!sessionToUse) {
      console.log('🔄 No session available, auto-creating session for message...');
      sessionToUse = await forceNewSession('luminos-assistant', 'Assistente Luminus');
      
      if (!sessionToUse) {
        console.error('❌ Could not create session for message');
        return false;
      }
    }

    // Get authenticated user first
    const user = await validateAuth();
    if (!user) {
      console.error('❌ User not authenticated, cannot save message');
      return false;
    }

    const messageId = crypto.randomUUID();
    const timestamp = new Date();
    const newMessage: ChatMessage = {
      ...message,
      id: messageId,
      timestamp
    };

    try {
      console.log('💾 Saving message to database:', {
        id: messageId,
        session_id: sessionToUse.id,
        role: newMessage.role,
        content_length: newMessage.content.length,
        user_id: user.id,
        has_files: !!newMessage.files
      });

      setIsSaving(true);
      
      // **CRITICAL CHANGE**: Save to database FIRST before updating UI
      // This ensures data persistence even if UI updates fail
      
      // First, verify that the session exists in the database
      const { data: sessionExists, error: sessionCheckError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', sessionToUse.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (sessionCheckError) {
        console.error('❌ Error checking session existence:', sessionCheckError);
        throw new Error('Erro ao verificar sessão: ' + sessionCheckError.message);
      }

      if (!sessionExists) {
        console.log('🔄 Session does not exist in database, creating it first...');
        
        const { data: createdSession, error: createSessionError } = await supabase
          .from('chat_sessions')
          .insert({
            id: sessionToUse.id,
            name: sessionToUse.name,
            contract_id: sessionToUse.contract_id,
            agent_id: sessionToUse.agent_id,
            user_id: user.id,
            created_at: sessionToUse.created_at,
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createSessionError) {
          console.error('❌ Failed to create session in database:', createSessionError);
          throw new Error('Erro ao criar sessão: ' + createSessionError.message);
        }
        
        console.log('✅ Session created in database:', createdSession);
      } else {
        console.log('✅ Session exists in database:', sessionExists.id);
      }

      // Now save the message to database
      const { data: insertedMessage, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          id: messageId,
          session_id: sessionToUse.id,
          role: newMessage.role,
          content: newMessage.content,
          metadata: newMessage.files ? { files: newMessage.files } : null,
          user_id: user.id,
          created_at: timestamp.toISOString()
        })
        .select('*')
        .single();

      if (messageError) {
        console.error('❌ Error saving message to database:', {
          error: messageError,
          code: messageError.code,
          message: messageError.message,
          details: messageError.details,
          hint: messageError.hint
        });
        
        // Detailed error diagnosis
        if (messageError.code === '23503') {
          console.error('🔍 Foreign key constraint failed - session might not exist');
        } else if (messageError.code === '42501') {
          console.error('🔍 Permission denied - RLS policy blocking insert');
        } else if (messageError.code === '23505') {
          console.error('🔍 Duplicate key - message already exists');
        }
        
        throw new Error('Erro ao salvar mensagem: ' + messageError.message);
      }

      console.log('✅ Message saved to database successfully:', {
        id: insertedMessage.id,
        session_id: insertedMessage.session_id,
        role: insertedMessage.role
      });

      // Update session timestamp in database
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionToUse.id)
        .eq('user_id', user.id);

      console.log('✅ Session timestamp updated');

      // **AFTER** successful database save, update UI
      setCurrentSession(prev => {
        if (!prev) return prev;
        
        const updatedSession = {
          ...prev,
          messages: [...prev.messages, newMessage],
          updated_at: new Date().toISOString()
        };
        
        // Save to localStorage after successful database save
        saveSessionToStorage(updatedSession);
        return updatedSession;
      });

      console.log('✅ Message added to UI successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Complete error in addMessage:', error);
      
      // Show user-friendly error message
      toast({
        title: "Erro ao salvar mensagem",
        description: error instanceof Error ? error.message : "Erro desconhecido ao salvar",
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [currentSession, saveSessionToStorage, validateAuth, forceNewSession, toast]);

  // Clear session from localStorage
  const clearSessionFromStorage = useCallback(() => {
    const storageKey = generateStorageKey();
    localStorage.removeItem(storageKey);
    console.log('🗑️ Session cleared from storage');
  }, [generateStorageKey]);

  // Clear current session and localStorage
  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
    clearSessionFromStorage();
    console.log('🗑️ Session cleared');
  }, [clearSessionFromStorage]);

  // Optimized cross-tab synchronization with debouncing
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const handleStorageChange = (e: StorageEvent) => {
      const storageKey = generateStorageKey();
      
      if (e.key === storageKey && e.newValue) {
        clearTimeout(debounceTimer);
        
        debounceTimer = setTimeout(() => {
          try {
            const sessionData = JSON.parse(e.newValue);
            
            // Only sync if timestamp is newer
            if (sessionData.timestamp > lastSyncTimestampRef.current) {
              console.log('🔄 Cross-tab sync: updating from other tab');
              
              // If it's a different session, load it
              if (sessionData.sessionId !== currentSession?.id) {
                loadSessionFromDatabase(sessionData.sessionId);
              } else if (sessionData.messages && 
                        sessionData.messages.length > (currentSession?.messages?.length || 0)) {
                // Same session but more messages - update
                setCurrentSession(prev => prev ? {
                  ...prev,
                  messages: sessionData.messages.map((msg: unknown) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                  }))
                } : null);
                
                lastSyncTimestampRef.current = sessionData.timestamp;
              }
            }
          } catch (error) {
            console.error('Error syncing across tabs:', error);
          }
        }, 300); // 300ms debounce
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearTimeout(debounceTimer);
    };
  }, [generateStorageKey, currentSession, loadSessionFromDatabase]);

  // Initialize session on mount and maintain it
  useEffect(() => {
    const initializeSession = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;
      
      // Apply the same delay pattern that works in AI agents - wait for auth to be fully established
      console.log('⏳ [ChatSession] Waiting for authentication to be established...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const user = await validateAuth(5); // Increase retry attempts
      if (!user) {
        console.log('❌ [ChatSession] Authentication failed after delay');
        isInitializedRef.current = false; // Reset flag to allow retry
        return;
      }
      
      console.log('🔄 [ChatSession] Initializing session for contract:', contractId, 'with user:', user.id);
      
      // First, try to find the most recent session for this contract
      try {
        const { data: existingSessions, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('contract_id', contractId)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (!sessionError && existingSessions && existingSessions.length > 0) {
          const mostRecentSession = existingSessions[0];
          console.log('✅ [ChatSession] Found existing session:', mostRecentSession.id);
          
          // Load this session with its messages
          const loadedSession = await loadSessionFromDatabase(mostRecentSession.id);
          if (loadedSession) {
            console.log('✅ [ChatSession] Restored existing session with', loadedSession.messages.length, 'messages');
            return;
          }
        } else {
          console.log('ℹ️ [ChatSession] No existing sessions found, will create new one when needed');
        }
      } catch (error) {
        console.error('❌ [ChatSession] Error checking for existing sessions:', error);
      }
      
      // If no existing session, silently initialize a new one only if needed
      // Don't create session immediately - wait for first message
      console.log('✅ [ChatSession] Ready to create new session when first message is sent');
    };

    if (contractId && !currentSession) {
      // Delay initialization to ensure auth is ready
      const timer = setTimeout(() => {
        initializeSession();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (isInitializedRef.current) {
          isInitializedRef.current = false;
        }
      };
    }

    // Reset initialization flag when contractId changes completely
    return () => {
      if (isInitializedRef.current) {
        isInitializedRef.current = false;
      }
    };
  }, [contractId, currentSession, getOrMaintainSession, validateAuth, loadSessionFromDatabase]);

  // Load the most recent session for a contract
  const loadMostRecentSession = useCallback(async (): Promise<ChatSession | null> => {
    const user = await validateAuth();
    if (!user) {
      console.error('❌ [ChatSession] User not authenticated');
      return null;
    }

    try {
      setIsLoading(true);
      console.log('🔄 [ChatSession] Loading most recent session for contract:', contractId);
      
      // Find the most recent session for this contract
      const { data: sessions, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('contract_id', contractId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (sessionError) {
        console.error('❌ [ChatSession] Error finding sessions:', sessionError);
        return null;
      }
      
      if (!sessions || sessions.length === 0) {
        console.log('ℹ️ [ChatSession] No existing sessions found for this contract');
        return null;
      }
      
      const mostRecentSession = sessions[0];
      console.log('✅ [ChatSession] Found recent session:', mostRecentSession.id);
      
      // Load this session with its messages
      const loadedSession = await loadSessionFromDatabase(mostRecentSession.id);
      if (loadedSession) {
        console.log('✅ [ChatSession] Loaded session with', loadedSession.messages.length, 'messages');
      }
      
      return loadedSession;
    } catch (error) {
      console.error('❌ [ChatSession] Error loading recent session:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [validateAuth, contractId, loadSessionFromDatabase]);

  return {
    currentSession,
    isLoading,
    isSaving,
    forceNewSession,
    addMessage,
    loadSessionFromDatabase,
    clearCurrentSession,
    getOrMaintainSession,
    loadMostRecentSession
  };
};
