
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, AlertTriangle, XCircle, FileText, Eye, BarChart3 } from 'lucide-react';

interface AnalysisData {
  resumo: string;
  confiabilidade: 'alta' | 'média' | 'baixa';
  extractedTextLength: number;
  numPages: number;
  extractionMethod: string;
  fieldsFound: number;
  totalFields: number;
}

interface AnalysisSummaryProps {
  analysis: AnalysisData;
  fileName: string;
}

const AnalysisSummary = ({ analysis, fileName }: AnalysisSummaryProps) => {
  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'alta':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'média':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'baixa':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'alta':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'média':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'baixa':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const confidencePercentage = Math.round((analysis.fieldsFound / analysis.totalFields) * 100);

  return (
    <div className="mt-3">
      <Card className={`border ${getConfidenceColor(analysis.confiabilidade)}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center space-x-2">
              {getConfidenceIcon(analysis.confiabilidade)}
              <span>Análise Concluída</span>
            </span>
            <Badge variant="outline" className="text-xs">
              {analysis.confiabilidade} confiança
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-sm">
            <p className="font-medium mb-1">Resumo da Análise:</p>
            <p className="text-muted-foreground line-clamp-2">{analysis.resumo}</p>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{analysis.fieldsFound}/{analysis.totalFields} campos encontrados ({confidencePercentage}%)</span>
            <span>{analysis.numPages} páginas • {Math.round(analysis.extractedTextLength / 1000)}k caracteres</span>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Eye className="h-3 w-3 mr-2" />
                Ver Análise Completa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Análise Detalhada: {fileName}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getConfidenceIcon(analysis.confiabilidade)}
                    <span className="font-medium">Confiabilidade: {analysis.confiabilidade}</span>
                  </div>
                  <Badge variant="secondary">{confidencePercentage}% dos dados encontrados</Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Resumo da Análise</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {analysis.resumo}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Estatísticas de Extração</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Páginas processadas:</span>
                        <span className="font-medium">{analysis.numPages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Texto extraído:</span>
                        <span className="font-medium">{analysis.extractedTextLength.toLocaleString()} caracteres</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Método de extração:</span>
                        <span className="font-medium">{analysis.extractionMethod}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Campos Encontrados</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Dados encontrados:</span>
                        <span className="font-medium text-green-600">{analysis.fieldsFound}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Não informado:</span>
                        <span className="font-medium text-red-600">{analysis.totalFields - analysis.fieldsFound}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa de sucesso:</span>
                        <span className="font-medium">{confidencePercentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {analysis.confiabilidade === 'baixa' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">Recomendações</h4>
                    <p className="text-xs text-yellow-700">
                      Poucos dados foram encontrados no documento. Verifique se o PDF contém texto legível 
                      ou se é uma imagem escaneada que precisa de OCR.
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisSummary;
