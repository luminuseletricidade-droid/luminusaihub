import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Calendar, AlertTriangle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateSafe } from '@/utils/formatters';

interface AIPrediction {
  id: string;
  prediction_type: string;
  predicted_date: string;
  confidence_score: number;
  reasoning: string;
  status: string;
  created_at: string;
}

interface MaintenancePattern {
  equipment_type: string;
  average_interval: number;
  next_suggested_date: string;
  confidence: number;
}

interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  description?: string;
}

interface Suggestion {
  id: string;
  type: string;
  date: string;
  description: string;
}

interface AICalendarInsightsProps {
  events: CalendarEvent[];
  onSuggestionAccept?: (suggestion: Suggestion) => void;
}

export default function AICalendarInsights({ events, onSuggestionAccept }: AICalendarInsightsProps) {
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [patterns, setPatterns] = useState<MaintenancePattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadPredictions = useCallback(async () => {
    const { data, error } = await supabase
      .from('ai_predictions')
      .select('*')
      .eq('status', 'pending')
      .order('confidence_score', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Erro ao carregar previsões:', error);
      return;
    }

    setPredictions(data || []);
  }, []);

  const analyzePatterns = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      // Análise básica de padrões de manutenção
      const maintenanceHistory = events.filter(e => e.type === 'maintenance');
      
      // Agrupar por tipo de equipamento
      const equipmentTypes = maintenanceHistory.reduce((acc: Record<string, CalendarEvent[]>, maintenance) => {
        const type = maintenance.title.split(' - ')[0];
        if (!acc[type]) acc[type] = [];
        acc[type].push(maintenance);
        return acc;
      }, {} as Record<string, CalendarEvent[]>);

      const analysisPatterns: MaintenancePattern[] = [];

      for (const [equipmentType, maintenances] of Object.entries(equipmentTypes)) {
        if (Array.isArray(maintenances) && maintenances.length >= 2) {
          // Calcular intervalo médio entre manutenções
          const sortedMaintenances = maintenances.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          const intervals = [];
          for (let i = 1; i < sortedMaintenances.length; i++) {
            const diff = new Date(sortedMaintenances[i].date).getTime() - 
                        new Date(sortedMaintenances[i-1].date).getTime();
            intervals.push(diff / (1000 * 60 * 60 * 24)); // dias
          }

          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const lastMaintenance = sortedMaintenances[sortedMaintenances.length - 1];
          const nextSuggestedDate = new Date(lastMaintenance.date);
          nextSuggestedDate.setDate(nextSuggestedDate.getDate() + Math.round(avgInterval));

          // Calcular confiança baseada na consistência dos intervalos
          const variance = intervals.reduce((acc, interval) => 
            acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
          const confidence = Math.max(0.1, Math.min(0.95, 1 - (variance / (avgInterval * avgInterval))));

          analysisPatterns.push({
            equipment_type: equipmentType,
            average_interval: Math.round(avgInterval),
            next_suggested_date: nextSuggestedDate.toISOString().split('T')[0],
            confidence: confidence
          });
        }
      }

      setPatterns(analysisPatterns);
      
      // Salvar previsões no banco
      if (analysisPatterns.length > 0) {
        await savePredictions(analysisPatterns);
      }
      
    } catch (error) {
      console.error('Erro na análise de padrões:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [events]);

  useEffect(() => {
    loadPredictions();
    analyzePatterns();
  }, [loadPredictions, analyzePatterns]);

  const savePredictions = async (patterns: MaintenancePattern[]) => {
    const predictions = patterns.map(pattern => ({
      prediction_type: 'maintenance_schedule',
      predicted_date: pattern.next_suggested_date,
      confidence_score: pattern.confidence,
      reasoning: `Baseado no histórico de ${pattern.equipment_type}, o intervalo médio entre manutenções é de ${pattern.average_interval} dias.`,
      status: 'pending'
    }));

    const { error } = await supabase
      .from('ai_predictions')
      .insert(predictions);

    if (error) {
      console.error('Erro ao salvar previsões:', error);
    }
  };

  const acceptSuggestion = async (prediction: AIPrediction) => {
    try {
      // Marcar previsão como aceita
      await supabase
        .from('ai_predictions')
        .update({ status: 'accepted' })
        .eq('id', prediction.id);

      // Criar evento no calendário
      if (onSuggestionAccept) {
        onSuggestionAccept({
          title: `Manutenção Sugerida pela IA`,
          date: prediction.predicted_date,
          time: '09:00',
          type: 'maintenance',
          status: 'pending',
          reasoning: prediction.reasoning
        });
      }

      // Remover da lista local
      setPredictions(prev => prev.filter(p => p.id !== prediction.id));

      toast({
        title: "Sugestão aceita",
        description: "A manutenção foi agendada conforme sugerido pela IA."
      });
    } catch (error) {
      console.error('Erro ao aceitar sugestão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar a sugestão.",
        variant: "destructive"
      });
    }
  };

  const dismissSuggestion = async (prediction: AIPrediction) => {
    try {
      await supabase
        .from('ai_predictions')
        .update({ status: 'dismissed' })
        .eq('id', prediction.id);

      setPredictions(prev => prev.filter(p => p.id !== prediction.id));

      toast({
        title: "Sugestão dispensada",
        description: "A sugestão foi removida da lista."
      });
    } catch (error) {
      console.error('Erro ao dispensar sugestão:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.6) return 'Média';
    return 'Baixa';
  };

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>Insights da IA</span>
            {isAnalyzing && (
              <Badge variant="secondary" className="ml-2">
                <Zap className="h-3 w-3 mr-1" />
                Analisando...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{patterns.length}</div>
              <div className="text-sm text-muted-foreground">Padrões Identificados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{predictions.length}</div>
              <div className="text-sm text-muted-foreground">Sugestões Pendentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {patterns.filter(p => p.confidence > 0.7).length}
              </div>
              <div className="text-sm text-muted-foreground">Alta Confiança</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Sugestões da IA</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      {formatDateSafe(prediction.predicted_date)}
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getConfidenceColor(prediction.confidence_score)}
                  >
                    {getConfidenceLabel(prediction.confidence_score)} 
                    ({Math.round(prediction.confidence_score * 100)}%)
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {prediction.reasoning}
                </p>
                
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => acceptSuggestion(prediction)}
                    className="flex-1"
                  >
                    Aceitar Sugestão
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => dismissSuggestion(prediction)}
                    className="flex-1"
                  >
                    Dispensar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pattern Analysis */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>Padrões Identificados</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {patterns.map((pattern, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{pattern.equipment_type}</span>
                  <Badge 
                    variant="outline"
                    className={getConfidenceColor(pattern.confidence)}
                  >
                    Confiança: {Math.round(pattern.confidence * 100)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Intervalo Médio:</span>
                    <div className="font-medium">{pattern.average_interval} dias</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Próxima Sugestão:</span>
                    <div className="font-medium">
                      {formatDateSafe(pattern.next_suggested_date)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {predictions.length === 0 && patterns.length === 0 && !isAnalyzing && (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Acumule mais dados de manutenção para insights da IA
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              A IA precisa de pelo menos 2 manutenções por tipo de equipamento
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}