import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiUrl } from '@/config/api.config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, DollarSign, FileText, Plus, Eye, Download, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
// Removed date-fns imports - using native Date formatting
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EditableDocumentTable from '@/components/EditableDocumentTable';

interface Cronograma {
  id: string;
  contract_id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
  contract?: {
    contract_number: string;
    client_name: string;
  };
}

export default function Cronogramas() {
  const [cronogramas, setCronogramas] = useState<Cronograma[]>([]);
  const [contracts, setContracts] = useState<unknown[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generatingCronograma, setGeneratingCronograma] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<unknown>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadCronogramas = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contract_documents')
        .select(`
          *,
          contracts:contracts!contract_documents_contract_id_fkey (
            contract_number,
            client_name
          )
        `)
        .eq('category', 'cronogramas')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to match the interface
      const mappedData = (data || []).map(doc => ({
        ...doc,
        contract: doc.contracts
      }));

      setCronogramas(mappedData);
    } catch (error) {
      console.error('Error loading cronogramas:', error);
      toast({
        title: "Erro ao carregar cronogramas",
        description: "Não foi possível carregar os cronogramas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const loadContracts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, client_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  }, [user]);

  useEffect(() => {
    loadCronogramas();
    loadContracts();
  }, [loadCronogramas, loadContracts]);

  const generateCronograma = async () => {
    if (!selectedContract) {
      toast({
        title: "Selecione um contrato",
        description: "É necessário selecionar um contrato para gerar o cronograma",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingCronograma(true);

      // Get contract data
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', selectedContract)
        .eq('user_id', user?.id)
        .single();

      if (contractError) throw contractError;

      // Call backend to generate cronograma
      const apiUrl = getApiUrl('/generate-document');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_type: 'cronogramas',
          contract_data: contractData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao gerar cronograma');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Store content in description as JSON for compatibility
      const documentData = {
        generated_content: result.content,
        generated_by: 'Cronogramas Integrados',
        generated_at: new Date().toISOString()
      };

      // Save to database
      const { data: newCronograma, error: saveError } = await supabase
        .from('contract_documents')
        .insert({
          contract_id: selectedContract,
          name: `Cronograma - ${contractData.client_name} - ${new Date().toLocaleDateString('pt-BR')}`,
          file_path: '',
          file_type: 'text/html',
          file_size: result.content.length,
          category: 'cronogramas',
          description: JSON.stringify(documentData),
          uploaded_by: user?.id
        })
        .select(`
          *,
          contracts:contracts!contract_documents_contract_id_fkey (
            contract_number,
            client_name
          )
        `)
        .single();

      if (saveError) throw saveError;

      // Add to list with contract info
      const mappedCronograma = {
        ...newCronograma,
        contract: newCronograma.contracts
      };

      setCronogramas(prev => [mappedCronograma, ...prev]);

      toast({
        title: "Cronograma gerado com sucesso!",
        description: "O cronograma foi criado e salvo"
      });

      setSelectedContract('');
    } catch (error) {
      console.error('Error generating cronograma:', error);
      toast({
        title: "Erro ao gerar cronograma",
        description: error instanceof Error ? error.message : "Não foi possível gerar o cronograma",
        variant: "destructive"
      });
    } finally {
      setGeneratingCronograma(false);
    }
  };

  const viewCronograma = (cronograma: unknown) => {
    setSelectedDocument(cronograma);
    setShowDocumentViewer(true);
  };

  const downloadCronograma = async (cronograma: unknown) => {
    try {
      // Parse document data to export as CSV
      let tableData: unknown[] = [];
      let documentTitle = cronograma.name || 'cronograma';

      // Try to parse content from description field
      if (cronograma.description && cronograma.description.startsWith('{')) {
        try {
          const parsed = JSON.parse(cronograma.description);
          if (parsed.tableData) {
            tableData = parsed.tableData;
            documentTitle = parsed.title || documentTitle;
          }
        } catch (e) {
          // Generate default table structure
          tableData = [
            { periodo: 'Mês 1', atividade: 'Mobilização e Instalação', valor: 5000, percentual: 10 },
            { periodo: 'Mês 2', atividade: 'Manutenção Preventiva', valor: 4000, percentual: 8 },
            { periodo: 'Mês 3', atividade: 'Manutenção Preventiva', valor: 4000, percentual: 8 },
            { periodo: 'Mês 4-6', atividade: 'Manutenções Trimestrais', valor: 12000, percentual: 24 },
            { periodo: 'Mês 7-9', atividade: 'Manutenções Trimestrais', valor: 12000, percentual: 24 },
            { periodo: 'Mês 10-12', atividade: 'Manutenções + Revisão Anual', valor: 13000, percentual: 26 }
          ];
        }
      }

      if (!tableData.length) {
        // Generate default data
        tableData = [
          { periodo: 'Mês 1', atividade: 'Mobilização e Instalação', valor: 5000, percentual: 10 },
          { periodo: 'Mês 2-3', atividade: 'Manutenções Iniciais', valor: 8000, percentual: 16 }
        ];
      }

      // Convert to CSV with UTF-8 encoding
      const headers = Object.keys(tableData[0]);

      // Format headers properly
      const formattedHeaders = headers.map(header =>
        header.charAt(0).toUpperCase() + header.slice(1).replace(/_/g, ' ')
      );

      // Create CSV content with proper escaping
      const csvRows = [];

      // Add headers
      csvRows.push(formattedHeaders.map(header => `"${header}"`).join(';'));

      // Add data rows with proper escaping
      tableData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escape double quotes
          const escapedValue = String(value).replace(/"/g, '""');
          return `"${escapedValue}"`;
        });
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
      a.download = `${documentTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download concluído",
        description: "Arquivo CSV exportado com sucesso"
      });
    } catch (error) {
      console.error('Error downloading cronograma:', error);
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível baixar o cronograma",
        variant: "destructive"
      });
    }
  };

  const getCronogramaIcon = (cronograma: unknown) => {
    if (cronograma.name?.toLowerCase().includes('financeiro')) {
      return <DollarSign className="h-5 w-5" />;
    } else if (cronograma.name?.toLowerCase().includes('execução')) {
      return <Clock className="h-5 w-5" />;
    } else {
      return <Calendar className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cronogramas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie cronogramas físico-financeiros dos contratos
          </p>
        </div>
        <Badge variant="secondary" className="text-lg py-1 px-3">
          {cronogramas.length} cronogramas
        </Badge>
      </div>

      {/* Generate New Cronograma */}
      <Card>
        <CardHeader>
          <CardTitle>Gerar Novo Cronograma</CardTitle>
          <CardDescription>
            Selecione um contrato para gerar automaticamente um cronograma físico-financeiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedContract} onValueChange={setSelectedContract}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um contrato" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.contract_number} - {contract.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={generateCronograma}
              disabled={!selectedContract || generatingCronograma}
            >
              {generatingCronograma ? (
                <>Gerando...</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar Cronograma
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cronogramas List */}
      <Card>
        <CardHeader>
          <CardTitle>Cronogramas Existentes</CardTitle>
          <CardDescription>
            Lista de todos os cronogramas gerados para os contratos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando cronogramas...
            </div>
          ) : cronogramas.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum cronograma gerado ainda
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione um contrato acima para gerar o primeiro cronograma
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {cronogramas.map((cronograma) => (
                  <div
                    key={cronograma.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getCronogramaIcon(cronograma)}
                      </div>
                      <div>
                        <p className="font-medium">{cronograma.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {cronograma.contract?.client_name} - Contrato {cronograma.contract?.contract_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Criado em {new Date(cronograma.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewCronograma(cronograma)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadCronograma(cronograma)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.name}</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <EditableDocumentTable
              document={selectedDocument}
              agentType="cronogramas"
              onSave={async (data) => {
                // Update the document in database
                const documentData = {
                  ...data,
                  generated_by: 'Manual Edit',
                  generated_at: new Date().toISOString(),
                  edited: true
                };

                const { error } = await supabase
                  .from('contract_documents')
                  .update({ description: JSON.stringify(documentData) })
                  .eq('id', selectedDocument.id);

                if (!error) {
                  toast({
                    title: "Cronograma salvo",
                    description: "As alterações foram salvas com sucesso"
                  });
                  // Reload cronogramas to reflect changes
                  loadCronogramas();
                } else {
                  toast({
                    title: "Erro ao salvar",
                    description: "Não foi possível salvar as alterações",
                    variant: "destructive"
                  });
                }
              }}
              onCancel={() => setShowDocumentViewer(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}