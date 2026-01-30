import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SecureFileUpload } from "@/components/SecureFileUpload";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit2, Trash2, Download, Upload, Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MaintenanceDetailsView from "./MaintenanceDetailsView";

interface MaintenanceData {
  id: string;
  contract_id?: string;
  equipment_id?: string;
  type: string;
  status: string;
  status_id?: string;
  description?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  end_time?: string;
  completed_date?: string;
  technician?: string;
  notes?: string;
  frequency?: string;
  estimated_duration?: number;
  priority?: string;
  created_at: string;
  updated_at: string;
}

interface MaintenanceStatus {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface MaintenanceDocument {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  category: string;
  description?: string;
  created_at: string;
}

interface Contract {
  id: string;
  contract_number: string;
  description?: string;
  clients?: {
    name: string;
  };
}

interface Equipment {
  id: string;
  type: string;
  model?: string;
  location?: string;
}

interface Region {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

interface MaintenanceEditDialogProps {
  maintenance: unknown; // Usar any para evitar conflito de tipos
  onUpdate: (updatedMaintenance: unknown) => void;
  children: React.ReactNode;
}

const maintenanceTypes = [
  'Manutenção Preventiva 250h',
  'Manutenção Preventiva 500h',
  'Manutenção Mensal',
  'Manutenção Corretiva',
  'Atendimento Emergencial',
  'Teste de Carga / Operação Assistida de Partida',
  'Startup / Comissionamento',
  'Avarias de Controlador',
  'Visita Técnica Orçamentária',
  'Visita Técnica de Inspeção',
  'Inspeção de Alternador',
  'Limpeza de Radiador',
  'Instalação de Equipamentos',
  'Instalação de GMG – Próprio (permanente)',
  'Limpeza de Tanque',
  'Troca de Bateria',
  'Manutenção Mensal (complementar)',
  'Regulagem de Válvulas',
  'Revisão/Calibração de Bomba Injetora',
  'Entrega/Retirada de GMG'
];

const priorities = [
  { value: 'low', label: 'Baixa', color: '#10b981' },
  { value: 'medium', label: 'Média', color: '#f59e0b' },
  { value: 'high', label: 'Alta', color: '#ef4444' },
  { value: 'urgent', label: 'Urgente', color: '#dc2626' }
];

export default function MaintenanceEditDialog({ maintenance, onUpdate, children }: MaintenanceEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<unknown>(maintenance);
  const [statuses, setStatuses] = useState<MaintenanceStatus[]>([]);
  const [documents, setDocuments] = useState<MaintenanceDocument[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string; color?: string; is_active?: boolean }[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');
  const [showNewStatusForm, setShowNewStatusForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    maintenance.scheduled_date ? new Date(maintenance.scheduled_date + 'T00:00:00') : undefined
  );
  const { toast } = useToast();

  const loadStatuses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_status')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_documents')
        .select('*')
        .eq('maintenance_id', maintenance.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }, [maintenance.id]);

  const loadContracts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          description,
          clients!contracts_client_id_fkey (
            name
          )
        `)
        .order('contract_number');

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  }, []);

  const loadEquipment = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('type');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
    }
  }, []);

  const loadRegions = useCallback(async () => {
    try {
      const data = await apiFetch<Region[]>('/api/regions');
      // Filter only active regions
      setRegions((data || []).filter(r => r.is_active));
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadStatuses();
      loadDocuments();
      loadContracts();
      loadEquipment();
      loadRegions();
    }
  }, [open, loadStatuses, loadDocuments, loadContracts, loadEquipment, loadRegions]);

  // Real-time sync - atualizar dados sempre que o maintenance prop mudar
  useEffect(() => {
    setFormData(maintenance);
    setSelectedDate(maintenance.scheduled_date ? new Date(maintenance.scheduled_date + 'T00:00:00') : undefined);
  }, [maintenance]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Formatar a data usando o timezone local sem conversão
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      handleInputChange('scheduled_date', `${year}-${month}-${day}`);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenances')
        .update(formData)
        .eq('id', maintenance.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data);
      setOpen(false);
      toast({
        title: "Sucesso",
        description: "Manutenção atualizada com sucesso",
      });
    } catch (error) {
      console.error('Error updating maintenance:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar manutenção",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatusName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('maintenance_status')
        .insert({
          name: newStatusName,
          color: newStatusColor,
        })
        .select()
        .single();

      if (error) throw error;

      setStatuses(prev => [...prev, data]);
      setNewStatusName('');
      setNewStatusColor('#3b82f6');
      setShowNewStatusForm(false);
      toast({
        title: "Sucesso",
        description: "Status criado com sucesso",
      });
    } catch (error) {
      console.error('Error creating status:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar status",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${maintenance.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('maintenance-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('maintenance_documents')
        .insert({
          maintenance_id: maintenance.id,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          category: 'general',
        });

      if (dbError) throw dbError;

      loadDocuments();
      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar documento",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (documentId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('maintenance-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('maintenance_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      loadDocuments();
      toast({
        title: "Sucesso",
        description: "Documento removido com sucesso",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover documento",
        variant: "destructive",
      });
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('maintenance-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar documento",
        variant: "destructive",
      });
    }
  };

  const getPriorityInfo = (priority?: string) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Manutenção: {maintenance.type}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="schedule">Agendamento</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <MaintenanceDetailsView 
              maintenance={formData} 
              onUpdate={(updated) => {
                setFormData(updated);
                onUpdate(updated);
              }} 
            />
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Manutenção</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={formData.priority || 'medium'} onValueChange={(value) => handleInputChange('priority', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: priority.color }}
                          />
                          {priority.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract">Contrato</Label>
                <Select value={formData.contract_id || ''} onValueChange={(value) => handleInputChange('contract_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.contract_number} - {contract.clients?.name || 'Cliente não informado'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment">Equipamento</Label>
                <Select value={formData.equipment_id || ''} onValueChange={(value) => handleInputChange('equipment_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.type} {eq.model && `- ${eq.model}`} ({eq.location || 'Local não informado'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician">Técnico Responsável</Label>
                <Input
                  id="technician"
                  value={formData.technician || ''}
                  onChange={(e) => handleInputChange('technician', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Região</Label>
                <Select value={formData.region_id || ''} onValueChange={(value) => handleInputChange('region_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={regions.length === 0 ? "Nenhuma região cadastrada" : "Selecione a região"} />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        <div className="flex items-center gap-2">
                          {region.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: region.color }}
                            />
                          )}
                          {region.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Select value={formData.frequency || ''} onValueChange={(value) => handleInputChange('frequency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="semiannual">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="one-time">Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status_id || ''} onValueChange={(value) => handleInputChange('status_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Data Agendada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    locale={ptBR}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário e Duração
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_time">Horário Início</Label>
                      <Input
                        id="scheduled_time"
                        type="time"
                        value={formData.scheduled_time || '09:00'}
                        onChange={(e) => handleInputChange('scheduled_time', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_time">Horário Fim</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={(formData.end_time && formData.end_time.trim() !== '') ? formData.end_time : ''}
                        onChange={(e) => handleInputChange('end_time', e.target.value)}
                        min={formData.scheduled_time}
                        placeholder="Selecione o horário de término"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estimated_duration">Duração Estimada (minutos)</Label>
                      <Input
                        id="estimated_duration"
                        type="number"
                        value={formData.estimated_duration || 120}
                        onChange={(e) => handleInputChange('estimated_duration', parseInt(e.target.value))}
                        min="15"
                        step="15"
                      />
                    </div>
                  </CardContent>
                </Card>

                {selectedDate && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumo do Agendamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Data:</strong> {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        <p><strong>Horário Início:</strong> {formData.scheduled_time || '09:00'}</p>
                        <p><strong>Horário Fim:</strong> {formData.end_time || '11:00'}</p>
                        <p><strong>Duração:</strong> {formData.estimated_duration || 120} minutos</p>
                        <p><strong>Prioridade:</strong>
                          <Badge
                            variant="outline"
                            className="ml-2"
                            style={{
                              borderColor: getPriorityInfo(formData.priority).color,
                              color: getPriorityInfo(formData.priority).color
                            }}
                          >
                            {getPriorityInfo(formData.priority).label}
                          </Badge>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Enviar Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SecureFileUpload 
                  onFileUpload={handleFileUpload}
                  allowedTypes={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos da Manutenção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.file_size && `${(doc.file_size / 1024 / 1024).toFixed(2)} MB`} • 
                          Enviado em {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(doc.file_path, doc.name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum documento enviado
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Status Disponíveis
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewStatusForm(!showNewStatusForm)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Status
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewStatusForm && (
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-status-name">Nome do Status</Label>
                      <Input
                        id="new-status-name"
                        value={newStatusName}
                        onChange={(e) => setNewStatusName(e.target.value)}
                        placeholder="Ex: Em Análise"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-status-color">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="new-status-color"
                          type="color"
                          value={newStatusColor}
                          onChange={(e) => setNewStatusColor(e.target.value)}
                          className="w-20"
                        />
                        <Input
                          value={newStatusColor}
                          onChange={(e) => setNewStatusColor(e.target.value)}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateStatus} size="sm">
                        Criar Status
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowNewStatusForm(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {statuses.map((status) => (
                    <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="font-medium">{status.name}</span>
                      </div>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: status.color,
                          color: status.color 
                        }}
                      >
                        {status.name}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}