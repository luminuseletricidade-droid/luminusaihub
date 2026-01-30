import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Edit, X, Plus, Trash2, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import HTMLDocumentViewer from '@/components/HTMLDocumentViewer';

interface EditableDocumentTableProps {
  document: unknown;
  agentType: string;
  onSave?: (data: unknown) => void;
  onCancel?: () => void;
}

export const EditableDocumentTable: React.FC<EditableDocumentTableProps> = ({
  document,
  agentType,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [tableData, setTableData] = useState<unknown[]>([]);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentSummary, setDocumentSummary] = useState('');
  const [isHTML, setIsHTML] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  const parseDocumentContent = useCallback(() => {
    // Initialize with default structure based on agent type
    switch (agentType) {
      case 'manutencao':
        setDocumentTitle('Plano de Manutenção Preventiva');
        setDocumentSummary('Este plano de manutenção foi gerado automaticamente com base nas especificações do equipamento e normas técnicas aplicáveis. Inclui manutenções preventivas mensais, vistorias periódicas de 250h e 500h, e procedimentos de verificação completa do sistema.');
        setTableData([
          { mes: 'Janeiro', data: '15/01/2025', tecnico: '', tipo_os: 'Manutenção Mensal', descricao: 'Verificação completa do sistema' },
          { mes: 'Fevereiro', data: '15/02/2025', tecnico: '', tipo_os: 'Vistoria 250h', descricao: 'Inspeção preventiva trimestral' },
          { mes: 'Março', data: '15/03/2025', tecnico: '', tipo_os: 'Manutenção Mensal', descricao: 'Verificação completa do sistema' },
          { mes: 'Abril', data: '15/04/2025', tecnico: '', tipo_os: 'Manutenção Mensal', descricao: 'Verificação completa do sistema' },
          { mes: 'Maio', data: '15/05/2025', tecnico: '', tipo_os: 'Vistoria 500h', descricao: 'Inspeção preventiva semestral' },
          { mes: 'Junho', data: '15/06/2025', tecnico: '', tipo_os: 'Manutenção Mensal', descricao: 'Verificação completa do sistema' }
        ]);
        break;
      
      case 'cronogramas':
        setDocumentTitle('Cronograma Físico-Financeiro');
        setDocumentSummary('Cronograma desenvolvido considerando as fases de implantação, execução e manutenção do contrato. O valor total foi distribuído ao longo do período contratual de forma a otimizar o fluxo de caixa e garantir a execução adequada dos serviços.');
        setTableData([
          { periodo: 'Mês 1', atividade: 'Mobilização e Instalação', valor: 5000, percentual: 10 },
          { periodo: 'Mês 2', atividade: 'Manutenção Preventiva', valor: 4000, percentual: 8 },
          { periodo: 'Mês 3', atividade: 'Manutenção Preventiva', valor: 4000, percentual: 8 },
          { periodo: 'Mês 4-6', atividade: 'Manutenções Trimestrais', valor: 12000, percentual: 24 },
          { periodo: 'Mês 7-9', atividade: 'Manutenções Trimestrais', valor: 12000, percentual: 24 },
          { periodo: 'Mês 10-12', atividade: 'Manutenções + Revisão Anual', valor: 13000, percentual: 26 }
        ]);
        break;
      
      case 'documentacao':
        setDocumentTitle('Documentação Técnica');
        setDocumentSummary('Memorial descritivo e especificações técnicas do equipamento conforme informações extraídas do contrato. Este documento serve como referência para manutenções e operações técnicas.');
        setTableData([
          { item: 'Equipamento', especificacao: 'Grupo Gerador 150 kVA', observacao: 'Standby automático' },
          { item: 'Potência', especificacao: '150 kVA', observacao: 'Fator de potência 0.8' },
          { item: 'Tensão', especificacao: '380V', observacao: 'Trifásico' },
          { item: 'Frequência', especificacao: '60 Hz', observacao: 'Padrão brasileiro' },
          { item: 'Motor', especificacao: 'Diesel', observacao: 'Consumo aprox. 30L/h' },
          { item: 'Tanque', especificacao: '250 Litros', observacao: 'Autonomia 8 horas' }
        ]);
        break;
      
      case 'relatorios':
        setDocumentTitle('Relatório de Análise');
        setDocumentSummary('Análise de desempenho do contrato com base nos indicadores chave (KPIs). Todos os indicadores estão dentro ou acima das metas estabelecidas, demonstrando excelente performance operacional.');
        setTableData([
          { indicador: 'Disponibilidade', valor: '99.8%', status: 'Excelente', meta: '99%' },
          { indicador: 'MTBF', valor: '720 horas', status: 'Bom', meta: '600 horas' },
          { indicador: 'MTTR', valor: '2 horas', status: 'Ótimo', meta: '4 horas' },
          { indicador: 'Conformidade', valor: '100%', status: 'Excelente', meta: '95%' },
          { indicador: 'Satisfação', valor: '4.8/5', status: 'Excelente', meta: '4.0/5' }
        ]);
        break;
      
      default:
        setDocumentTitle('Documento');
        setTableData([]);
    }

    // Try to parse existing content if available
    if (document?.content || document?.description) {
      try {
        const content = document.content || document.description;

        // Check if content is HTML
        if (typeof content === 'string' && (
          content.includes('<html') ||
          content.includes('<!DOCTYPE') ||
          content.includes('<body') ||
          content.includes('<table') && content.includes('<style')
        )) {
          console.log('✅ Detectado conteúdo HTML - usando HTMLDocumentViewer');
          setIsHTML(true);
          setHtmlContent(content);
          setDocumentTitle(document.name || document.title || 'Documento');
          return;
        }

        // Try to parse as JSON
        if (typeof content === 'string' && content.startsWith('{')) {
          const parsed = JSON.parse(content);
          if (parsed.tableData) {
            setTableData(parsed.tableData);
          }
          if (parsed.title) {
            setDocumentTitle(parsed.title);
          }
          if (parsed.summary) {
            setDocumentSummary(parsed.summary);
          }
        }
      } catch (e) {
        console.log('Using default table structure');
      }
    }

    // Reset HTML mode if no HTML found
    setIsHTML(false);
  }, [agentType, document]);

  useEffect(() => {
    parseDocumentContent();
  }, [parseDocumentContent]);

  const handleCellEdit = (rowIndex: number, field: string, value: unknown) => {
    const newData = [...tableData];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setTableData(newData);
  };

  const addRow = () => {
    const newRow = { ...tableData[0] };
    // Clear values for new row
    Object.keys(newRow).forEach(key => {
      newRow[key] = '';
    });
    setTableData([...tableData, newRow]);
  };

  const deleteRow = (index: number) => {
    if (tableData.length > 1) {
      setTableData(tableData.filter((_, i) => i !== index));
    }
  };

  const saveDocument = async () => {
    try {
      const documentData = {
        title: documentTitle,
        summary: documentSummary,
        tableData: tableData,
        agentType: agentType,
        updatedAt: new Date().toISOString()
      };

      // Update document in database
      if (document?.id) {
        const { error } = await supabase
          .from('contract_documents')
          .update({
            description: JSON.stringify(documentData)
          })
          .eq('id', document.id);

        if (error) throw error;
      }

      toast({
        title: "Documento salvo",
        description: "As alterações foram salvas com sucesso"
      });

      if (onSave) {
        onSave(documentData);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o documento",
        variant: "destructive"
      });
    }
  };

  const exportToCSV = () => {
    if (!tableData.length) return;

    const headers = Object.keys(tableData[0]);

    // Format headers properly in Portuguese
    const formattedHeaders = headers.map(header => formatHeader(header));

    // Create CSV content with proper escaping and formatting
    const csvRows = [];

    // Add headers
    csvRows.push(formattedHeaders.map(header => `"${header}"`).join(';'));

    // Add data rows with proper escaping for special characters
    tableData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape double quotes by doubling them
        const escapedValue = String(value).replace(/"/g, '""');
        return `"${escapedValue}"`;
      });
      csvRows.push(values.join(';'));
    });

    const csvContent = csvRows.join('\r\n');

    // Add UTF-8 BOM to ensure proper encoding in Excel
    const BOM = '\uFEFF';
    const finalContent = BOM + csvContent;

    // Create blob with explicit UTF-8 encoding
    const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${documentTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "CSV exportado",
      description: "O arquivo foi exportado com sucesso"
    });
  };

  const getColumnHeaders = () => {
    if (!tableData.length) return [];
    return Object.keys(tableData[0]);
  };

  const formatHeader = (header: string) => {
    return header
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // If content is HTML, use HTMLDocumentViewer instead of table
  if (isHTML && htmlContent) {
    return (
      <HTMLDocumentViewer
        htmlContent={htmlContent}
        documentTitle={documentTitle}
        onClose={onCancel}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="text-lg font-semibold"
                placeholder="Título do documento"
              />
            ) : (
              <CardTitle>{documentTitle}</CardTitle>
            )}
            {documentSummary && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong>Resumo:</strong> {documentSummary}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={saveDocument}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    parseDocumentContent(); // Reset data
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {getColumnHeaders().map((header) => (
                  <TableHead key={header}>{formatHeader(header)}</TableHead>
                ))}
                {isEditing && <TableHead className="w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {getColumnHeaders().map((header) => (
                    <TableCell key={header}>
                      {isEditing ? (
                        <Input
                          value={row[header] || ''}
                          onChange={(e) => handleCellEdit(rowIndex, header, e.target.value)}
                          className="min-w-[100px]"
                        />
                      ) : (
                        <span>{row[header] || '-'}</span>
                      )}
                    </TableCell>
                  ))}
                  {isEditing && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRow(rowIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {isEditing && (
          <div className="mt-4">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={addRow}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Linha
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EditableDocumentTable;