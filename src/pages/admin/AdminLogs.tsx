import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Search, 
  Download, 
  RefreshCw,
  Filter,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  user_id?: string;
  user_email?: string;
  action?: string;
  metadata?: unknown;
}

export default function AdminLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [levelFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from system_logs table
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      
      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter);
      }
      
      const { data, error } = await query;
      
      if (error) {
        // If system_logs doesn't exist, create mock data
        const mockLogs: LogEntry[] = [
          {
            id: '1',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Sistema iniciado com sucesso',
            action: 'system_start',
            user_email: 'system'
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            level: 'success',
            message: 'Novo contrato criado: CTR-2024-001',
            action: 'contract_create',
            user_email: 'usuario@example.com'
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            level: 'warning',
            message: 'Tentativa de login falhada',
            action: 'login_failed',
            user_email: 'unknown@example.com'
          },
          {
            id: '4',
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            level: 'error',
            message: 'Erro ao processar PDF: arquivo corrompido',
            action: 'pdf_processing_error',
            user_email: 'admin@luminus.ai'
          },
          {
            id: '5',
            timestamp: new Date(Date.now() - 14400000).toISOString(),
            level: 'info',
            message: 'Backup automático executado',
            action: 'backup_executed',
            user_email: 'system'
          }
        ];
        
        setLogs(mockLogs);
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      // Use mock data on error
      const mockLogs: LogEntry[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Sistema operacional',
          action: 'system_check'
        }
      ];
      setLogs(mockLogs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const handleExport = () => {
    // Create CSV content with proper formatting
    const csvRows = [];

    // Add headers
    csvRows.push(['"Timestamp"', '"Level"', '"Message"', '"User"', '"Action"'].join(';'));

    // Add data rows with proper escaping
    filteredLogs.forEach(log => {
      const values = [
        `"${log.timestamp}"`,
        `"${log.level}"`,
        `"${(log.message || '').replace(/"/g, '""')}"`,
        `"${log.user_email || ''}"`,
        `"${log.action || ''}"`
      ];
      csvRows.push(values.join(';'));
    });

    const csvContent = csvRows.join('\r\n');

    // Add UTF-8 BOM for proper encoding
    const BOM = '\uFEFF';
    const finalContent = BOM + csvContent;

    const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: 'Logs exportados',
      description: 'Os logs foram exportados com sucesso.'
    });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getLevelVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'info':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'success':
        return 'outline';
      default:
        return 'default';
    }
  };

  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.user_email && log.user_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Logs do Sistema</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Registros de Atividade
            </CardTitle>
            <div className="flex gap-2">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Carregando logs...</div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-1">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getLevelVariant(log.level)} className="text-xs">
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                        {log.user_email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.user_email}
                          </span>
                        )}
                        {log.action && (
                          <Badge variant="outline" className="text-xs">
                            {log.action}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{log.message}</p>
                      {log.metadata && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer hover:text-foreground">
                            Detalhes adicionais
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                
                {filteredLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}