
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Wrench, FileText, Calculator, Zap } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
}

interface AgentSelectorProps {
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
}

const defaultAgents: Agent[] = [
  {
    id: 'contract-extractor',
    name: 'Conversa Geral',
    description: 'Especialista em extração de dados de documentos contratuais',
    type: 'contract',
    icon: 'Bot'
  },
  {
    id: 'maintenance-planner',
    name: 'Plano de Manutenção e Cronograma',
    description: 'Geração automática de planos de manutenção com cronograma detalhado',
    type: 'maintenance',
    icon: 'Wrench'
  },
  {
    id: 'technical-documentation',
    name: 'Documentação Técnica e EAP',
    description: 'Memorial descritivo, custos e estrutura hierárquica de projetos',
    type: 'technical',
    icon: 'Calculator'
  },
  {
    id: 'integrated-schedules',
    name: 'Cronogramas Integrados',
    description: 'Cronogramas físico-financeiro, compras e desembolso',
    type: 'financial',
    icon: 'Zap'
  },
  {
    id: 'reports-generator',
    name: 'Relatórios',
    description: 'Geração de relatórios executivos profissionais',
    type: 'custom',
    icon: 'FileText'
  }
];

const AgentSelector = ({ selectedAgentId, onSelectAgent }: AgentSelectorProps) => {
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [customAgents, setCustomAgents] = useState<Agent[]>([]);

  useEffect(() => {
    loadCustomAgents();
  }, []);

  const loadCustomAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_generated_plans')
        .select('*')
        .eq('plan_type', 'custom_agent')
        .eq('status', 'active');

      if (error) throw error;

      const customAgentList: Agent[] = (data || []).map(item => ({
        id: item.id,
        name: item.content.split('|')[0] || 'Agente Personalizado',
        description: item.content.split('|')[1] || 'Agente criado pelo usuário',
        type: 'custom',
        icon: 'FileText'
      }));

      setCustomAgents(customAgentList);
    } catch (error) {
      console.error('Error loading custom agents:', error);
    }
  };

  const getAgentIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bot': return <Bot className="h-4 w-4" />;
      case 'Wrench': return <Wrench className="h-4 w-4" />;
      case 'Calculator': return <Calculator className="h-4 w-4" />;
      case 'Zap': return <Zap className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getAgentBadgeColor = (type: string) => {
    switch (type) {
      case 'contract': return 'default';
      case 'maintenance': return 'secondary';
      case 'financial': return 'outline';
      case 'technical': return 'destructive';
      case 'custom': return 'outline';
      default: return 'default';
    }
  };

  const allAgents = [...agents, ...customAgents];
  const selectedAgent = allAgents.find(agent => agent.id === selectedAgentId);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Agente:</span>
      </div>
      
      <Select value={selectedAgentId} onValueChange={onSelectAgent}>
        <SelectTrigger className="w-64 h-9">
          <SelectValue>
            {selectedAgent ? (
              <div className="flex items-center gap-2">
                {getAgentIcon(selectedAgent.icon)}
                <span className="truncate">{selectedAgent.name}</span>
                <Badge variant={getAgentBadgeColor(selectedAgent.type)} className="text-xs ml-auto">
                  {selectedAgent.type}
                </Badge>
              </div>
            ) : (
              "Selecione um agente"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-80">
          {allAgents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-start gap-3 py-1">
                {getAgentIcon(agent.icon)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{agent.name}</span>
                    <Badge variant={getAgentBadgeColor(agent.type)} className="text-xs">
                      {agent.type}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {agent.description}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AgentSelector;
