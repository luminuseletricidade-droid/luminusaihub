import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export function DebugChatHistory() {
  const { user: authUser, session, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (authLoading) {
      setError('Aguardando autenticação...');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Get user from AuthContext
      if (!authUser) {
        setError('No user found in AuthContext');
        return;
      }

      console.log('User from AuthContext:', authUser);

      const currentUser = authUser;

      // 2. Get sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_messages(id)
        `)
        .eq('user_id', currentUser.id)
        .eq('contract_id', 'ai-agents');

      if (sessionsError) {
        setError(`Sessions error: ${sessionsError.message}`);
        return;
      }

      setSessions(sessionsData || []);
      console.log('Sessions:', sessionsData);

    } catch (err: unknown) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [authLoading, authUser]);
  
  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);
  
  return (
    <Card className="p-4">
      <h3 className="font-bold mb-4">Debug Chat History</h3>
      
      <div className="space-y-2">
        <div>
          <strong>User ID:</strong> {authUser?.id || 'Not loaded'}
        </div>
        
        <div>
          <strong>Sessions Count:</strong> {sessions.length}
        </div>
        
        {error && (
          <div className="text-red-500">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <Button onClick={loadData} disabled={loading}>
          {loading ? 'Loading...' : 'Reload Data'}
        </Button>
        
        <div className="mt-4">
          <strong>Sessions:</strong>
          <pre className="text-xs overflow-auto max-h-[200px] bg-gray-100 p-2 rounded">
            {JSON.stringify(sessions, null, 2)}
          </pre>
        </div>
      </div>
    </Card>
  );
}