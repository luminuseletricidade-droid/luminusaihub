import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/utils/toastManager';
import { Search, Building, Edit, Trash2, Phone, Mail, Globe, ChevronDown, ChevronRight, FolderOpen, FileText, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { API_BASE_URL } from '@/config/api.config';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ClientEditDialog from '@/components/ClientEditDialog';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { ClientsSkeleton } from '@/components/LoadingStates';

interface Client {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  status_id?: string;
  notes?: string;
  contact_person?: string;
  secondary_phone?: string;
  website?: string;
  created_at?: string;
  updated_at?: string;
  total_contracts?: number;
  active_contracts?: number;
  inactive_contracts?: number;
  contracts?: unknown[];
}

interface ClientStatus {
  id: string;
  name: string;
  color: string;
  description?: string;
}

const Clients = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStatuses, setClientStatuses] = useState<ClientStatus[]>([]);
  const [expandedClients, setExpandedClients] = useState<string[]>([]);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);


  // Carregar todos os clientes via Backend API (consistent)
  const loadClients = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use AuthContext session - it's already validated
      if (!session?.access_token) {
        console.log('⏳ [Clients] Aguardando autenticação via AuthContext...');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ [Clients] Sessão válida via AuthContext');

      // Use Backend API directly for clients (same pattern as dashboard and maintenances)
      const clientsResponse = await fetch(`${API_BASE_URL}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!clientsResponse.ok) {
        console.error('Erro ao carregar clientes via API:', clientsResponse.status);
        toast({
          title: "Erro",
          description: "Não foi possível carregar clientes",
          variant: "destructive",
        });
        return;
      }
      
      const clientsData = await clientsResponse.json();
      console.log('✅ [Clients] Clientes carregados via Backend API:', clientsData.length);

      // Also load contracts to get contract count per client
      const contractsResponse = await fetch(`${API_BASE_URL}/api/contracts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let contractsData = [];
      if (contractsResponse.ok) {
        contractsData = await contractsResponse.json();
      }

      // Load client statuses
      const [statusResponse] = await Promise.all([
        supabase
          .from('client_status')
          .select('*')
          .order('name', { ascending: true })
      ]);

      if (statusResponse.error) {
        throw statusResponse.error;
      }

      // Add contract information to clients
      const clientsWithContracts = clientsData.map(client => {
        const clientContracts = contractsData.filter(contract => contract.client_id === client.id);
        const activeContracts = clientContracts.filter((c: unknown) => ['active', 'renewal'].includes(c.status)).length;
        const inactiveContracts = clientContracts.filter((c: unknown) => !['active', 'renewal'].includes(c.status)).length;
        
        return {
          ...client,
          total_contracts: clientContracts.length,
          active_contracts: activeContracts,
          inactive_contracts: inactiveContracts,
          contracts: clientContracts
        };
      });

      setClients(clientsWithContracts);
      setClientStatuses(statusResponse.data || []);
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    // Only load clients when we have a valid session from AuthContext
    if (session?.access_token && !authLoading) {
      console.log('✅ [Clients] AuthContext pronto, carregando clientes...');
      loadClients();
    } else if (!authLoading && !session) {
      console.log('⚠️ [Clients] Nenhuma sessão encontrada no AuthContext');
      setIsLoading(false);
    }
  }, [session, authLoading, loadClients]);

  // Sincronização em tempo real
  useRealtimeSync({
    onDataUpdate: loadClients,
    tables: ['contracts', 'clients'],
    showNotifications: false
  });

  const handleDeleteClient = async (clientId: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🗑️ Iniciando deleção do cliente:', clientId);

      // 1. Verificar se usuário tem acesso ao cliente via client_users
      // @ts-ignore - client_users table not in generated types
      const { data: userRelationship, error: relationshipError } = await supabase
        .from('client_users')
        .select('id, role')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (relationshipError || !userRelationship) {
        toast({
          title: "Erro",
          description: "Você não tem permissão para deletar este cliente",
          variant: "destructive"
        });
        return;
      }

      // 2. Verificar quantos usuários têm acesso a este cliente
      // @ts-ignore - client_users table not in generated types
      const { data: allRelationships, error: countError } = await supabase
        .from('client_users')
        .select('user_id')
        .eq('client_id', clientId);

      if (countError) {
        console.error('Erro ao contar relacionamentos:', countError);
        throw countError;
      }

      const userCount = allRelationships?.length || 0;
      console.log(`👥 Cliente compartilhado com ${userCount} usuário(s)`);

      // 3. Se há mais de um usuário, apenas remover o relacionamento
      if (userCount > 1) {
        // @ts-ignore - client_users table not in generated types
        const { error: removeRelationshipError } = await supabase
          .from('client_users')
          .delete()
          .eq('client_id', clientId)
          .eq('user_id', user.id);

        if (removeRelationshipError) {
          console.error('Erro ao remover relacionamento:', removeRelationshipError);
          throw removeRelationshipError;
        }

        // Remove da lista local
        setClients(prev => prev.filter(c => c.id !== clientId));

        toast({
          title: "Acesso removido",
          description: `Você não tem mais acesso a este cliente. O cliente ainda existe para ${userCount - 1} outro(s) usuário(s).`,
        });
        return;
      }

      // 4. Se é o único usuário, deletar cliente e todos os dados relacionados
      console.log('🗑️ Único usuário com acesso, deletando cliente completamente...');

      // Get all contracts for this client
      const { data: clientContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id')
        .eq('client_id', clientId);

      if (contractsError) {
        console.error('Erro ao buscar contratos:', contractsError);
      }

      // Delete all related data for each contract
      if (clientContracts && clientContracts.length > 0) {
        console.log(`🗑️ Deletando ${clientContracts.length} contrato(s) vinculado(s)...`);
        for (const contract of clientContracts) {
          // 1. Delete maintenances
          await supabase
            .from('maintenances')
            .delete()
            .eq('contract_id', contract.id);

          // 2. Delete equipment
          await supabase
            .from('equipment')
            .delete()
            .eq('contract_id', contract.id);

          // 3. Delete contract documents
          await supabase
            .from('contract_documents')
            .delete()
            .eq('contract_id', contract.id);

          // 4. Delete contract services
          await supabase
            .from('contract_services')
            .delete()
            .eq('contract_id', contract.id);

          // 5. Delete AI generated plans
          await supabase
            .from('ai_generated_plans')
            .delete()
            .eq('contract_id', contract.id);
        }

        // 6. Delete all contracts
        const { error: deleteContractsError } = await supabase
          .from('contracts')
          .delete()
          .eq('client_id', clientId);

        if (deleteContractsError) {
          console.error('Erro ao deletar contratos:', deleteContractsError);
        }
      }

      // 7. Delete client_users relationships (CASCADE should handle this, but being explicit)
      // @ts-ignore - client_users table not in generated types
      await supabase
        .from('client_users')
        .delete()
        .eq('client_id', clientId);

      // 8. Finally delete the client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        console.error('Erro ao deletar cliente:', error);
        toast({
          title: "Erro ao deletar cliente",
          description: "Não foi possível deletar o cliente. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Remove from local state
      setClients(prev => prev.filter(c => c.id !== clientId));

      toast({
        title: "Cliente deletado permanentemente",
        description: clientContracts && clientContracts.length > 0
          ? `Cliente e ${clientContracts.length} contrato(s) foram deletados com sucesso!`
          : "Cliente foi deletado com sucesso!"
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const filteredClients = clients.filter(client =>
    (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.cnpj && client.cnpj.includes(searchTerm)) ||
    (client.emergency_contact && client.emergency_contact.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/^(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  const toggleClientExpansion = (clientId: string) => {
    setExpandedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'renewal':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'draft':
        return 'Rascunho';
      case 'renewal':
        return 'Renovação';
      default:
        return 'Indefinido';
    }
  };

  if (isLoading) {
    return <ClientsSkeleton />;
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie o cadastro de clientes</p>
        </div>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-blue-900">Como adicionar novos clientes?</h3>
                <p className="text-xs text-blue-700 mt-1">
                  Novos clientes são criados automaticamente ao fazer upload de contratos na página <strong>Contratos</strong>.
                  O sistema extrai as informações do cliente do documento e vincula à sua conta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="relative w-full sm:w-80 lg:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Building className="h-5 w-5" />
            <span>Lista de Clientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {!searchTerm && 'Comece cadastrando seu primeiro cliente'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Empresa</TableHead>
                    <TableHead className="min-w-[120px] hidden sm:table-cell">CNPJ</TableHead>
                    <TableHead className="min-w-[150px] hidden md:table-cell">Contato</TableHead>
                    <TableHead className="min-w-[120px] hidden lg:table-cell">Telefone</TableHead>
                    <TableHead className="min-w-[80px] w-[80px]">
                      <span className="sr-only sm:not-sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
               <TableBody>
                 {filteredClients.map((client) => (
                   <React.Fragment key={client.id}>
                     <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <div 
                            className="flex items-start gap-2 cursor-pointer"
                            onClick={() => toggleClientExpansion(client.id)}
                          >
                            <div className="pt-1">
                              {expandedClients.includes(client.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{client.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {client.total_contracts || 0} contrato{(client.total_contracts || 0) !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              {client.contact_person && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {client.contact_person}
                                </div>
                              )}
                              
                              {/* Informações adicionais para telas pequenas */}
                              <div className="block sm:hidden mt-2 text-xs text-muted-foreground space-y-1">
                                {client.cnpj && <div>CNPJ: {formatCNPJ(client.cnpj)}</div>}
                                {client.email && <div className="truncate">Email: {client.email}</div>}
                                {client.phone && <div>Tel: {formatPhone(client.phone)}</div>}
                              </div>
                              <div className="flex gap-2 mt-2">
                                {(client.active_contracts || 0) > 0 && (
                                  <Badge className="text-xs bg-green-100 text-green-800">
                                    {client.active_contracts} ativo{(client.active_contracts || 0) !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {(client.inactive_contracts || 0) > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {client.inactive_contracts} inativo{client.inactive_contracts !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top hidden sm:table-cell">
                          <div className="pt-1">{client.cnpj ? formatCNPJ(client.cnpj) : '-'}</div>
                        </TableCell>
                        <TableCell className="align-top hidden md:table-cell">
                          <div className="pt-1">
                            <div>{client.email || '-'}</div>
                            {client.contact_person && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {client.contact_person}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top hidden lg:table-cell">
                          <div className="pt-1">{client.phone ? formatPhone(client.phone) : '-'}</div>
                        </TableCell>
                        <TableCell className="align-top w-[80px]">
                          <div className="flex justify-center sm:justify-end pt-1">
                            <div className="flex gap-1">
                              <ClientEditDialog
                                client={{
                                  ...client,
                                  created_at: client.created_at || new Date().toISOString(),
                                  updated_at: client.updated_at || new Date().toISOString()
                                }}
                                onUpdate={(updatedClient) => {
                                  setClients(prev => prev.map(c => c.id === updatedClient.id ? { ...c, ...updatedClient } : c));
                                }}
                              >
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </ClientEditDialog>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setClientToDelete(client.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                     </TableRow>
                     {expandedClients.includes(client.id) && (
                       <TableRow>
                         <TableCell colSpan={5} className="bg-muted/20 border-b">
                           <div className="p-4 space-y-3">
                             <h4 className="font-semibold text-sm flex items-center gap-2">
                               <FileText className="h-4 w-4" />
                               Contratos do Cliente
                             </h4>
                             {client.contracts && client.contracts.length > 0 ? (
                               <div className="grid gap-2">
                                 {client.contracts.map((contract: unknown) => (
                                   <div key={contract.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                     <div className="flex items-center gap-3">
                                       <FileText className="h-4 w-4 text-muted-foreground" />
                                       <div>
                                         <div className="font-medium text-sm">{contract.contract_number}</div>
                                         <div className="text-xs text-muted-foreground">ID: {contract.id.slice(0, 8)}...</div>
                                       </div>
                                     </div>
                                     <Badge className={getStatusColor(contract.status)}>
                                       {getStatusLabel(contract.status)}
                                     </Badge>
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <div className="text-sm text-muted-foreground py-2">
                                 Nenhum contrato encontrado para este cliente.
                               </div>
                             )}
                           </div>
                         </TableCell>
                       </TableRow>
                     )}
                   </React.Fragment>
                 ))}
               </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão de Cliente
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>
                  Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
                </p>
                {filteredClients.find(c => c.id === clientToDelete)?.total_contracts ? (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-semibold text-destructive mb-2">
                      ⚠️ Atenção: Este cliente tem {filteredClients.find(c => c.id === clientToDelete)?.total_contracts} contrato(s) associado(s)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ao excluir este cliente, os seguintes dados também serão removidos permanentemente:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>Todos os contratos do cliente</li>
                      <li>Todas as manutenções agendadas</li>
                      <li>Equipamentos cadastrados</li>
                      <li>Documentos e arquivos anexados</li>
                      <li>Histórico de conversas e planos gerados por IA</li>
                    </ul>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (clientToDelete) {
                  handleDeleteClient(clientToDelete);
                  setClientToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Clients;
