import React, { useState, useEffect, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  Save, 
  Edit2, 
  CheckCircle, 
  AlertCircle,
  List,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  completed?: boolean;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  maintenance_type: string;
  items: ChecklistItem[];
}

interface MaintenanceChecklistProps {
  maintenanceId: string;
  maintenanceType?: string;
  maintenanceStatus?: string;
  onProgressUpdate?: (progress: number) => void;
  onSummaryChange?: (summary: { total: number; completed: number; requiredTotal: number; requiredCompleted: number }) => void;
}

const LOCAL_DEFAULT_ITEMS: ChecklistItem[] = [
  { id: 'local-default-1', text: 'Verificar equipamentos de segurança', required: true, completed: false },
  { id: 'local-default-2', text: 'Testar funcionamento do equipamento', required: true, completed: false },
  { id: 'local-default-3', text: 'Limpar área de trabalho', required: false, completed: false },
  { id: 'local-default-4', text: 'Documentar procedimentos realizados', required: true, completed: false },
  { id: 'local-default-5', text: 'Registrar peças substituídas', required: false, completed: false },
  { id: 'local-default-6', text: 'Atualizar registro de manutenção', required: true, completed: false }
];

const isSchemaMissingError = (error?: PostgrestError | null) =>
  Boolean(
    error &&
      (error.code === 'PGRST205' ||
        (typeof error.message === 'string' && error.message.includes("Could not find the table")))
  );

type ChecklistSchemaMode = 'extended' | 'legacy' | 'local';
type ChecklistRecordRow = {
  id: string;
  maintenance_id?: string;
  item?: string | null;
  item_description?: string | null; // Legacy field
  title?: string | null;
  is_required?: boolean | null;
  required?: boolean | null; // Legacy field
  is_completed?: boolean | null;
};

const MaintenanceChecklist: React.FC<MaintenanceChecklistProps> = ({
  maintenanceId,
  maintenanceType = 'Preventiva',
  maintenanceStatus,
  onProgressUpdate,
  onSummaryChange
}) => {
  const { toast } = useToast();
  const { session, user } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('Manutenção Mensal');
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [schemaMode, setSchemaMode] = useState<ChecklistSchemaMode>('extended');
  const isExtendedMode = schemaMode === 'extended';

  const calculateProgressValue = (items: ChecklistItem[], completedIds: string[]) => {
    if (!items.length) {
      return 0;
    }
    const completedCount = items.filter(item => completedIds.includes(item.id)).length;
    return Math.round((completedCount / items.length) * 100);
  };

  const emitSummary = useCallback((items: ChecklistItem[], completedIds: string[]) => {
    if (!onSummaryChange) return;

    const total = items.length;
    const completed = items.filter(item => completedIds.includes(item.id)).length;
    const requiredItems = items.filter(item => item.required);
    const requiredCompleted = requiredItems.filter(item => completedIds.includes(item.id)).length;

    onSummaryChange({
      total,
      completed,
      requiredTotal: requiredItems.length,
      requiredCompleted
    });
  }, [onSummaryChange]);

  const updateProgressMetrics = useCallback((items: ChecklistItem[], completedIds: string[]) => {
    const value = calculateProgressValue(items, completedIds);
    setProgress(value);
    if (onProgressUpdate) {
      onProgressUpdate(value);
    }
    emitSummary(items, completedIds);
  }, [emitSummary, onProgressUpdate]);

  const loadTemplates = useCallback(async () => {
    if (!user?.id) {
      setTemplates([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('maintenance_checklist_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar templates de checklist:', error);
        setTemplates([]);
        return;
      }

      const formattedTemplates = (data || []).map((template: unknown) => ({
        id: template.id,
        name: template.name,
        description: template.description || '',
        maintenanceType: template.maintenance_type,
        items: Array.isArray(template.items) ? template.items : []
      }));

      setTemplates(formattedTemplates);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      setTemplates([]);
    }
  }, [user?.id]);

  const handleMissingExtendedSchema = useCallback(async () => {
    try {
      // First, try to detect if we have the extended schema by checking for specific columns
      const { error: extendedError } = await supabase
        .from('maintenance_checklist')
        .select('id, item, is_required, is_completed')
        .eq('maintenance_id', maintenanceId)
        .limit(1);

      if (!extendedError) {
        console.log('✅ Extended schema detected for maintenance_checklist');
        setSchemaMode('extended');
        return;
      }

      // If extended schema fails, try legacy schema
      const { error: legacyError } = await supabase
        .from('maintenance_checklist')
        .select('id, item_description, is_completed')
        .eq('maintenance_id', maintenanceId)
        .limit(1);

      if (!legacyError) {
        console.log('✅ Legacy schema detected for maintenance_checklist');
        setSchemaMode('legacy');
        return;
      }

      // If both fail, check if it's a missing table error
      if (isSchemaMissingError(extendedError) || isSchemaMissingError(legacyError)) {
        console.log('⚠️ Table maintenance_checklist not found, using local mode');
        setSchemaMode('local');
        return;
      }

      console.error('Unexpected error accessing maintenance checklist schema:', extendedError);
      setSchemaMode('local');
    } catch (error) {
      console.error('Error probing maintenance checklist schema:', error);
      setSchemaMode('local');
    }
  }, [maintenanceId]);

  const mapRowToChecklistItem = useCallback((row: ChecklistRecordRow): ChecklistItem => ({
    id: row.id,
    text: row.title ?? row.item ?? row.item_description ?? '',
    required: typeof row.is_required === 'boolean' ? row.is_required : (typeof row.required === 'boolean' ? row.required : false),
    completed: Boolean(row.is_completed)
  }), []);

  // Placeholder-based record is no longer used; items are keyed directly by maintenanceId

  const fetchChecklistItems = useCallback(
    async (_maintenanceId: string): Promise<ChecklistItem[]> => {
      const { data, error } = await supabase
        .from('maintenance_checklist')
        .select('*')
        .eq('maintenance_id', maintenanceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading checklist items:', error);
        return [];
      }

      return (data || []).map(mapRowToChecklistItem);
    },
    [mapRowToChecklistItem, maintenanceId]
  );

  const insertTemplateItems = useCallback(async (targetMaintenanceId: string, templateItems: ChecklistItem[]) => {
    if (templateItems.length === 0) {
      return [];
    }

    if (!isExtendedMode) {
      return templateItems.map(item => ({ ...item, completed: false }));
    }

    const now = new Date().toISOString();
    const payload = templateItems.map((item) => ({
      maintenance_id: targetMaintenanceId,
      item: item.text,
      is_required: item.required ?? false,
      is_completed: false,
      created_at: now,
      updated_at: now
    }));

    const { data, error } = await supabase
      .from('maintenance_checklist')
      .insert(payload)
      .select();

    if (error) {
      console.error('Error inserting template items:', error);
      return [];
    }

    return (data || []).map(mapRowToChecklistItem);
  }, [isExtendedMode, mapRowToChecklistItem]);

  const loadChecklist = useCallback(async () => {
    if (schemaMode === 'local') {
      setLoading(false);
      const localItems = LOCAL_DEFAULT_ITEMS.map(item => ({ ...item }));
      setChecklist(localItems);
      setCompletedItems([]);
      updateProgressMetrics(localItems, []);
      return;
    }

    if (schemaMode === 'legacy') {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('maintenance_checklist')
          .select('*')
          .eq('maintenance_id', maintenanceId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading legacy checklist:', error);
          setChecklist([]);
          setCompletedItems([]);
          updateProgressMetrics([], []);
          return;
        }

        const legacyItems = (data || []).map(mapRowToChecklistItem);

        const legacyCompleted = legacyItems
          .filter(item => item.completed)
          .map(item => item.id);

        console.log('📋 Loaded legacy checklist items:', legacyItems.length);
        setChecklist(legacyItems);
        setCompletedItems(legacyCompleted);
        updateProgressMetrics(legacyItems, legacyCompleted);
      } catch (error) {
        console.error('Unexpected error loading legacy checklist:', error);
        setChecklist([]);
        setCompletedItems([]);
        updateProgressMetrics([], []);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const items = await fetchChecklistItems(maintenanceId);
      const completedIds = items.filter(item => item.completed).map(item => item.id);
      setChecklist(items);
      setCompletedItems(completedIds);
      updateProgressMetrics(items, completedIds);
    } catch (error) {
      console.error('Error loading checklist:', error);
      if (isSchemaMissingError(error)) {
        await handleMissingExtendedSchema();
      }
    } finally {
      setLoading(false);
    }
  }, [
    handleMissingExtendedSchema,
    fetchChecklistItems,
    mapRowToChecklistItem,
    maintenanceId,
    schemaMode,
    updateProgressMetrics
  ]);

  useEffect(() => {
    setChecklistId(null);
    setChecklist([]);
    setCompletedItems([]);
    setProgress(0);
    if (onProgressUpdate) {
      onProgressUpdate(0);
    }
    if (onSummaryChange) {
      onSummaryChange({ total: 0, completed: 0, requiredTotal: 0, requiredCompleted: 0 });
    }
    loadChecklist();
    if (schemaMode === 'extended') {
      loadTemplates();
    } else {
      setTemplates([]);
    }
  }, [maintenanceId, schemaMode, user?.id, loadChecklist, loadTemplates, onProgressUpdate, onSummaryChange]);

  useEffect(() => {
    updateProgressMetrics(checklist, completedItems);
  }, [checklist, completedItems, updateProgressMetrics]);

  useEffect(() => {
    if (schemaMode !== 'extended') {
      setShowTemplateDialog(false);
      setSelectedTemplateId('');
    }
  }, [schemaMode]);

  const persistChecklistState = async (items: ChecklistItem[], completedIds: string[]) => {
    if (schemaMode === 'local') {
      updateProgressMetrics(items, completedIds);
      return;
    }

    if (schemaMode === 'legacy') {
      updateProgressMetrics(items, completedIds);
      return;
    }

    const progressValue = calculateProgressValue(items, completedIds);
    const requiredItems = items.filter(item => item.required);
    const requiredCompleted = requiredItems.filter(item => completedIds.includes(item.id)).length;

    const { error } = await supabase
      .from('maintenance_checklist_meta')
      .upsert(
        {
          maintenance_id: maintenanceId,
          progress: progressValue,
          is_completed: progressValue === 100,
          required_total: requiredItems.length,
          required_completed: requiredCompleted,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'maintenance_id' }
      );

    if (error) {
      console.error('Error saving checklist progress meta:', error);
      toast({
        title: "Erro ao salvar progresso",
        description: "Não foi possível registrar o andamento do checklist.",
        variant: "destructive"
      });
    } else {
      updateProgressMetrics(items, completedIds);
    }
  };

  const handleItemToggle = async (itemId: string) => {
    const currentItem = checklist.find(item => item.id === itemId);
    if (!currentItem) return;

    const toggledValue = !currentItem.completed;
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: toggledValue } : item
    );
    const updatedCompleted = toggledValue
      ? Array.from(new Set([...completedItems, itemId]))
      : completedItems.filter(id => id !== itemId);

    setChecklist(updatedChecklist);
    setCompletedItems(updatedCompleted);

    if (schemaMode === 'local') {
      updateProgressMetrics(updatedChecklist, updatedCompleted);
      return;
    }

    if (schemaMode === 'legacy') {
      const { error } = await supabase
        .from('maintenance_checklist')
        .update({
          is_completed: toggledValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating legacy checklist item:', error);
        toast({
          title: "Erro ao atualizar item",
          description: "Não foi possível atualizar o item do checklist.",
          variant: "destructive"
        });
        await loadChecklist();
      } else {
        updateProgressMetrics(updatedChecklist, updatedCompleted);
      }
      return;
    }

    const { error } = await supabase
      .from('maintenance_checklist')
      .update({
        is_completed: toggledValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating checklist item:', error);
      toast({
        title: "Erro ao atualizar item",
        description: "Não foi possível atualizar o item do checklist.",
        variant: "destructive"
      });
      await loadChecklist();
    } else {
      await persistChecklistState(updatedChecklist, updatedCompleted);
    }
  };

  const addItem = async () => {
    if (!newItemText.trim()) return;

    if (schemaMode === 'local') {
      const newChecklistItem: ChecklistItem = {
        id: `local-${Date.now()}`,
        text: newItemText.trim(),
        required: isRequired,
        completed: false
      };
      const nextChecklist = [...checklist, newChecklistItem];
      setChecklist(nextChecklist);
      updateProgressMetrics(nextChecklist, completedItems);
      setNewItemText('');
      setIsRequired(false);
      return;
    }

    if (schemaMode === 'legacy') {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('maintenance_checklist')
        .insert({
          maintenance_id: maintenanceId,
          item: newItemText.trim(),
          is_completed: false,
          created_at: now,
          updated_at: now
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error adding legacy checklist item:', error);
        toast({
          title: "Erro ao adicionar item",
          description: "Não foi possível adicionar o item ao checklist.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        const newChecklistItem = mapRowToChecklistItem(data);
        const nextChecklist = [...checklist, newChecklistItem];
        setChecklist(nextChecklist);
        updateProgressMetrics(nextChecklist, completedItems);
      }

      setNewItemText('');
      setIsRequired(false);
      return;
    }

    const now = new Date().toISOString();
    const payload = {
      maintenance_id: maintenanceId,
      item: newItemText.trim(),
      is_required: isRequired,
      is_completed: false,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('maintenance_checklist')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error adding checklist item:', error);
      toast({
        title: "Erro ao adicionar item",
        description: "Não foi possível adicionar o item ao checklist.",
        variant: "destructive"
      });
      return;
    }

    if (data) {
      const newChecklistItem = mapRowToChecklistItem(data);
      const nextChecklist = [...checklist, newChecklistItem];
      setChecklist(nextChecklist);
      await persistChecklistState(nextChecklist, completedItems);
      updateProgressMetrics(nextChecklist, completedItems);
    }
    
    setNewItemText('');
    setIsRequired(false);
  };

  const removeItem = async (itemId: string) => {
    if (schemaMode === 'local') {
      const nextChecklist = checklist.filter(item => item.id !== itemId);
      const nextCompleted = completedItems.filter(id => id !== itemId);
      setChecklist(nextChecklist);
      setCompletedItems(nextCompleted);
      updateProgressMetrics(nextChecklist, nextCompleted);
      return;
    }

    if (schemaMode === 'legacy') {
      const { error } = await supabase
        .from('maintenance_checklist')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error removing legacy checklist item:', error);
        toast({
          title: "Erro ao remover item",
          description: "Não foi possível remover o item do checklist.",
          variant: "destructive"
        });
        return;
      }

      const nextChecklist = checklist.filter(item => item.id !== itemId);
      const nextCompleted = completedItems.filter(id => id !== itemId);
      setChecklist(nextChecklist);
      setCompletedItems(nextCompleted);
      updateProgressMetrics(nextChecklist, nextCompleted);
      return;
    }

    const { error } = await supabase
      .from('maintenance_checklist')
      .delete()
      .eq('id', itemId);
    
    if (error) {
      console.error('Error removing checklist item:', error);
      toast({
        title: "Erro ao remover item",
        description: "Não foi possível remover o item do checklist.",
        variant: "destructive"
      });
      return;
    }
    
    const nextChecklist = checklist.filter(item => item.id !== itemId);
    const nextCompleted = completedItems.filter(id => id !== itemId);

    setChecklist(nextChecklist);
    setCompletedItems(nextCompleted);
    await persistChecklistState(nextChecklist, nextCompleted);
    updateProgressMetrics(nextChecklist, nextCompleted);
  };

  const createTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do template.",
        variant: "destructive"
      });
      return;
    }

    if (checklist.length === 0) {
      toast({
        title: "Checklist vazio",
        description: "Adicione itens ao checklist antes de criar um template.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('DEBUG createTemplate - user object:', user);
      console.log('DEBUG createTemplate - user?.id:', user?.id);
      if (!user?.id) {
        console.error('createTemplate - user.id is missing. user:', user);
        throw new Error('Usuário não autenticado');
      }

      const templateItems = checklist.map(item => ({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        text: item.text,
        required: item.required
      }));

      const { data, error } = await supabase
        .from('maintenance_checklist_templates')
        .insert({
          name: newTemplateName.trim(),
          description: newTemplateDescription.trim() || `Template criado em ${new Date().toLocaleDateString()}`,
          maintenance_type: newTemplateType,
          items: templateItems,
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        toast({
          title: "Erro ao criar template",
          description: "Não foi possível criar o template.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Template criado",
        description: `Template "${newTemplateName}" foi criado com sucesso!`
      });

      // Reset form
      setNewTemplateName('');
      setNewTemplateDescription('');
      setNewTemplateType('Manutenção Mensal');
      setShowCreateTemplateDialog(false);

      // Reload templates
      await loadTemplates();

    } catch (error) {
      console.error('Unexpected error creating template:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao criar o template.",
        variant: "destructive"
      });
    }
  };

  const applyTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    if (schemaMode === 'local') {
      const newItems = template.items || [];
      setChecklist(newItems);
      setCompletedItems([]);
      setSelectedTemplateId('');
      setShowTemplateDialog(false);
      updateProgressMetrics(newItems, []);
      toast({
        title: "Template aplicado",
        description: `O template "${template.name}" foi aplicado com sucesso`
      });
      return;
    }

    if (schemaMode === 'legacy') {
      const { error: deleteError } = await supabase
        .from('maintenance_checklist')
        .delete()
        .eq('maintenance_id', maintenanceId);

      if (deleteError) {
        console.error('Error clearing legacy checklist items:', deleteError);
        toast({
          title: "Erro ao aplicar template",
          description: "Não foi possível limpar os itens atuais do checklist.",
          variant: "destructive"
        });
        return;
      }

      const now = new Date().toISOString();
      const legacyPayload = (template.items || []).map(item => ({
        maintenance_id: maintenanceId,
        item: item.text,
        is_completed: false,
        created_at: now,
        updated_at: now
      }));

      let newItems: ChecklistItem[] = [];

      if (legacyPayload.length > 0) {
        const { data, error: insertError } = await supabase
          .from('maintenance_checklist')
          .insert(legacyPayload)
          .select();

        if (insertError) {
          console.error('Error inserting legacy template items:', insertError);
          toast({
            title: "Erro ao aplicar template",
            description: "Não foi possível inserir os itens do template.",
            variant: "destructive"
          });
          return;
        }

        newItems = (data || []).map(mapRowToChecklistItem);
      }

      setChecklist(newItems);
      setCompletedItems([]);
      setSelectedTemplateId('');
      setShowTemplateDialog(false);
      updateProgressMetrics(newItems, []);

      toast({
        title: "Template aplicado",
        description: `O template "${template.name}" foi aplicado com sucesso`
      });
      return;
    }

    const { error: deleteError } = await supabase
      .from('maintenance_checklist')
      .delete()
      .eq('maintenance_id', maintenanceId);

    if (deleteError) {
      console.error('Error clearing checklist items:', deleteError);
      toast({
        title: "Erro ao aplicar template",
        description: "Não foi possível limpar os itens atuais do checklist.",
        variant: "destructive"
      });
      return;
    }

    const newItems = await insertTemplateItems(maintenanceId, template.items || []);
    setChecklist(newItems);
    setCompletedItems([]);
    setSelectedTemplateId('');
    setShowTemplateDialog(false);
    await persistChecklistState(newItems, []);
    updateProgressMetrics(newItems, []);
    
    toast({
      title: "Template aplicado",
      description: `O template "${template.name}" foi aplicado com sucesso`
    });
  };

  const getRequiredItemsStatus = () => {
    const requiredItems = checklist.filter(item => item.required);
    const completedRequired = requiredItems.filter(item => 
      completedItems.includes(item.id)
    );
    
    return {
      total: requiredItems.length,
      completed: completedRequired.length,
      allCompleted: requiredItems.length > 0 && requiredItems.length === completedRequired.length
    };
  };

  const requiredStatus = getRequiredItemsStatus();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Lista de Verificação
          </CardTitle>
          <div className="flex items-center gap-2">
            {schemaMode === 'legacy' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Modo legado
              </Badge>
            )}
            {schemaMode === 'local' && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Sem persistência
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTemplateDialog(true)}
              disabled={schemaMode !== 'extended'}
              title={schemaMode !== 'extended' ? 'Templates disponíveis apenas com o novo esquema de checklist' : undefined}
            >
              <Settings className="h-4 w-4 mr-1" />
              Templates
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateTemplateDialog(true)}
              disabled={schemaMode !== 'extended' || checklist.length === 0}
              title={schemaMode !== 'extended' ? 'Criar templates disponível apenas com o novo esquema de checklist' : checklist.length === 0 ? 'Adicione itens ao checklist antes de criar um template' : undefined}
            >
              <Plus className="h-4 w-4 mr-1" />
              Criar Template
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              {isEditing ? 'Concluir' : 'Editar'}
            </Button>
          </div>
        </div>
        
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Progresso do Checklist
            </span>
            <span className="text-sm font-medium">
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {requiredStatus.total > 0 && (
            <div className="flex items-center gap-2">
              {requiredStatus.allCompleted ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Itens obrigatórios concluídos
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {requiredStatus.completed}/{requiredStatus.total} itens obrigatórios
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  checked={completedItems.includes(item.id)}
                  onCheckedChange={() => handleItemToggle(item.id)}
                />
                <div className="flex-1">
                  <span className={completedItems.includes(item.id) ? 'line-through text-muted-foreground' : ''}>
                    {item.text}
                  </span>
                  {item.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </div>
              </div>
              
              {isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeItem(item.id)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          
          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="Adicionar novo item..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isRequired}
                  onCheckedChange={(checked) => setIsRequired(checked as boolean)}
                />
                <Label className="text-sm whitespace-nowrap">Obrigatório</Label>
              </div>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {checklist.length === 0 && !isEditing && (
            <div className="text-center py-8 text-muted-foreground">
              <List className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum item no checklist</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setIsEditing(true)}
              >
                Adicionar itens
              </Button>
            </div>
          )}
        </div>
        
        {requiredStatus.total > 0 && (
          <p className="text-xs text-muted-foreground mt-4">
            * Itens obrigatórios devem ser concluídos antes de finalizar a manutenção
          </p>
        )}
      </CardContent>
    </Card>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Template</DialogTitle>
            <DialogDescription>
              Escolha um template para aplicar ao checklist
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => applyTemplate(selectedTemplateId)}
                disabled={!selectedTemplateId}
              >
                Aplicar Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTemplateDialog} onOpenChange={setShowCreateTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Template</DialogTitle>
            <DialogDescription>
              Crie um template baseado no checklist atual
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do Template</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Ex: Checklist Preventiva - Equipamentos Industriais"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-description">Descrição (opcional)</Label>
              <Textarea
                id="template-description"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Descreva quando usar este template..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-type">Tipo de Manutenção</Label>
              <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manutenção Preventiva 250h">Manutenção Preventiva 250h</SelectItem>
                  <SelectItem value="Manutenção Preventiva 500h">Manutenção Preventiva 500h</SelectItem>
                  <SelectItem value="Manutenção Mensal">Manutenção Mensal</SelectItem>
                  <SelectItem value="Manutenção Corretiva">Manutenção Corretiva</SelectItem>
                  <SelectItem value="Atendimento Emergencial">Atendimento Emergencial</SelectItem>
                  <SelectItem value="Teste de Carga / Operação Assistida de Partida">Teste de Carga / Operação Assistida de Partida</SelectItem>
                  <SelectItem value="Startup / Comissionamento">Startup / Comissionamento</SelectItem>
                  <SelectItem value="Avarias de Controlador">Avarias de Controlador</SelectItem>
                  <SelectItem value="Visita Técnica Orçamentária">Visita Técnica Orçamentária</SelectItem>
                  <SelectItem value="Visita Técnica de Inspeção">Visita Técnica de Inspeção</SelectItem>
                  <SelectItem value="Inspeção de Alternador">Inspeção de Alternador</SelectItem>
                  <SelectItem value="Limpeza de Radiador">Limpeza de Radiador</SelectItem>
                  <SelectItem value="Instalação de Equipamentos">Instalação de Equipamentos</SelectItem>
                  <SelectItem value="Instalação de GMG – Próprio (permanente)">Instalação de GMG – Próprio</SelectItem>
                  <SelectItem value="Limpeza de Tanque">Limpeza de Tanque</SelectItem>
                  <SelectItem value="Troca de Bateria">Troca de Bateria</SelectItem>
                  <SelectItem value="Manutenção Mensal (complementar)">Manutenção Mensal (complementar)</SelectItem>
                  <SelectItem value="Regulagem de Válvulas">Regulagem de Válvulas</SelectItem>
                  <SelectItem value="Revisão/Calibração de Bomba Injetora">Revisão/Calibração de Bomba Injetora</SelectItem>
                  <SelectItem value="Entrega/Retirada de GMG">Entrega/Retirada de GMG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Itens do Template ({checklist.length} itens)</Label>
              <div className="max-h-32 overflow-y-auto border rounded p-2 bg-muted/30">
                {checklist.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm py-1">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span>{item.text}</span>
                    {item.required && (
                      <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateTemplateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={createTemplate}
                disabled={!newTemplateName.trim()}
              >
                Criar Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MaintenanceChecklist;
