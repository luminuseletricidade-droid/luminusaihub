import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Pencil, Trash2, Play } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';

interface QuickReport {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: unknown;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

interface QuickReportManagerProps {
  reportTypes: unknown[];
  onReportGenerate: (reportType: any, startDate: string, endDate: string) => void;
}

const QuickReportManager = ({ reportTypes, onReportGenerate }: QuickReportManagerProps) => {
  const { toast } = useToast();
  const [quickReports, setQuickReports] = useState<QuickReport[]>([]);
  const [editingReport, setEditingReport] = useState<QuickReport | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [executingReport, setExecutingReport] = useState<QuickReport | null>(null);
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));

  // Inicializar com alguns relatórios padrão
  useEffect(() => {
    const defaultQuickReports: QuickReport[] = [
      {
        id: '1',
        title: 'Manutenções',
        description: 'Manutenções de máquinas internas',
        prompt: 'Especifique tipos de manutenções, detalhe limpezas, dificuldades',
        icon: Calendar,
        defaultStartDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
        defaultEndDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
      },
      {
        id: '2',
        title: 'Receita Trimestral',
        description: 'Análise de receita dos últimos 3 meses',
        prompt: 'Analise a receita de contratos, compare períodos, identifique tendências de crescimento',
        icon: Calendar,
        defaultStartDate: format(startOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd'),
        defaultEndDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
      },
      {
        id: '3',
        title: 'Preventiva vs Corretiva',
        description: 'Comparativo mensal de manutenções',
        prompt: 'Compare manutenções preventivas e corretivas, analise eficiência e custos',
        icon: Calendar,
        defaultStartDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
        defaultEndDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
      }
    ];
    setQuickReports(defaultQuickReports);
  }, []);

  const handleCreateQuickReport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const prompt = formData.get('prompt') as string;

    if (!title || !prompt) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e prompt do relatório são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const newReport: QuickReport = {
      id: Date.now().toString(),
      title,
      description,
      prompt,
      icon: Calendar,
      defaultStartDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
      defaultEndDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
    };

    setQuickReports(prev => [...prev, newReport]);
    setIsCreateDialogOpen(false);
    
    toast({
      title: "Relatório rápido criado",
      description: `${title} foi adicionado aos relatórios rápidos`
    });
  };

  const handleEditQuickReport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingReport) return;

    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const prompt = formData.get('prompt') as string;

    if (!title || !prompt) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e prompt do relatório são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const updatedReport: QuickReport = {
      ...editingReport,
      title,
      description,
      prompt,
      icon: Calendar
    };

    setQuickReports(prev => prev.map(r => r.id === editingReport.id ? updatedReport : r));
    setIsEditDialogOpen(false);
    setEditingReport(null);
    
    toast({
      title: "Relatório rápido atualizado",
      description: `${title} foi atualizado com sucesso`
    });
  };

  const handleDeleteQuickReport = (reportId: string) => {
    setQuickReports(prev => prev.filter(r => r.id !== reportId));
    toast({
      title: "Relatório removido",
      description: "Relatório rápido foi removido da lista"
    });
  };

  const handleExecuteQuickReport = () => {
    if (!executingReport || !startDate || !endDate) {
      toast({
        title: "Dados incompletos",
        description: "Selecione as datas para execução do relatório",
        variant: "destructive"
      });
      return;
    }

    // Usar o prompt do relatório para gerar relatório
    const promptReport = {
      id: 'prompt_based',
      title: executingReport.title,
      description: executingReport.description,
      prompt: executingReport.prompt
    };
    
    onReportGenerate(promptReport, startDate, endDate);
    setIsExecuteDialogOpen(false);
    setExecutingReport(null);
  };

  const openExecuteDialog = (report: QuickReport) => {
    setExecutingReport(report);
    setStartDate(report.defaultStartDate || format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
    setEndDate(report.defaultEndDate || format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
    setIsExecuteDialogOpen(true);
  };

  const openEditDialog = (report: QuickReport) => {
    setEditingReport(report);
    setIsEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Relatórios Rápidos</CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Relatório Rápido</DialogTitle>
                <DialogDescription>
                  Configure um novo relatório para execução rápida
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateQuickReport} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" name="title" placeholder="Nome do relatório rápido" required />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" name="description" placeholder="Descrição do relatório" />
                </div>
                <div>
                  <Label htmlFor="prompt">Prompt do Relatório</Label>
                  <Textarea 
                    id="prompt" 
                    name="prompt" 
                    placeholder="Especifique tipos de manutenções, detalhe limpezas, dificuldades..."
                    className="min-h-[80px]"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Criar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">
          Clique para executar relatórios pré-configurados com seleção de período
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {quickReports.map((report) => {
            const IconComponent = report.icon;
            return (
              <div
                key={report.id}
                className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {IconComponent && <IconComponent className="h-4 w-4 text-primary" />}
                    <div>
                      <h4 className="font-medium text-sm">{report.title}</h4>
                      <p className="text-xs text-muted-foreground">{report.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openExecuteDialog(report)}
                      className="text-primary hover:text-primary"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(report)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuickReport(report.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Dialog para executar relatório */}
      <Dialog open={isExecuteDialogOpen} onOpenChange={setIsExecuteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Executar: {executingReport?.title}</DialogTitle>
            <DialogDescription>
              {executingReport?.description || 'Selecione o período para gerar o relatório'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="startDate">Data Inicial</Label>
              <DatePicker
                id="startDate"
                value={startDate}
                onChangeString={setStartDate}
                allowWeekends={true}
                placeholder="Selecione a data inicial"
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final</Label>
              <DatePicker
                id="endDate"
                value={endDate}
                onChangeString={setEndDate}
                allowWeekends={true}
                placeholder="Selecione a data final"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsExecuteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleExecuteQuickReport}>
                <Calendar className="h-4 w-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar relatório */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Relatório Rápido</DialogTitle>
            <DialogDescription>
              Modifique as configurações do relatório rápido
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditQuickReport} className="space-y-4">
            <div>
              <Label htmlFor="editTitle">Título</Label>
              <Input 
                id="editTitle" 
                name="title" 
                defaultValue={editingReport?.title}
                placeholder="Nome do relatório rápido" 
                required 
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Descrição</Label>
              <Input 
                id="editDescription" 
                name="description" 
                defaultValue={editingReport?.description}
                placeholder="Descrição do relatório" 
              />
            </div>
            <div>
              <Label htmlFor="editPrompt">Prompt do Relatório</Label>
              <Textarea 
                id="editPrompt" 
                name="prompt" 
                defaultValue={editingReport?.prompt}
                placeholder="Especifique tipos de manutenções, detalhe limpezas, dificuldades..."
                className="min-h-[80px]"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuickReportManager;