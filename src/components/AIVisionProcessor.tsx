
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useVisionAI, VisionAnalysisType } from '@/hooks/useVisionAI';
import { Eye, Image, FileText, Settings, Upload, X } from 'lucide-react';

interface AnalysisResult {
  text?: string;
  confidence?: number;
  objects?: string[];
  analysis?: string;
  analysisType?: string;
  [key: string]: unknown;
}

interface AIVisionProcessorProps {
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

const AIVisionProcessor = ({ onAnalysisComplete }: AIVisionProcessorProps) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [analysisType, setAnalysisType] = useState<VisionAnalysisType>('general_analysis');
  const [prompt, setPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { analyzeImages, isProcessing } = useVisionAI();

  const analysisTypes = [
    { value: 'document_ocr', label: 'OCR - Extração de Texto', icon: FileText },
    { value: 'equipment_analysis', label: 'Análise de Equipamentos', icon: Settings },
    { value: 'report_analysis', label: 'Análise de Relatórios', icon: FileText },
    { value: 'general_analysis', label: 'Análise Geral', icon: Eye }
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalysis = async () => {
    if (selectedImages.length === 0) {
      return;
    }

    const result = await analyzeImages(selectedImages, analysisType, prompt);
    if (result) {
      setAnalysisResult(result);
      onAnalysisComplete?.(result);
    }
  };

  const formatAnalysisResult = (result: AnalysisResult) => {
    if (!result.analysis) {
      return <p className="text-sm text-muted-foreground">No analysis available</p>;
    }

    try {
      const parsed = JSON.parse(result.analysis);
      return (
        <div className="space-y-4">
          {Object.entries(parsed).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <h4 className="font-semibold text-sm capitalize">{key.replace('_', ' ')}</h4>
              <div className="text-sm text-muted-foreground">
                {typeof value === 'object' && value !== null ? (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                ) : (
                  <p>{String(value)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    } catch {
      return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.analysis}</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Image className="h-5 w-5" />
            <span>Upload de Imagens</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-upload">Selecionar Imagens</Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Suporta JPG, PNG, TIFF, WebP
            </p>
          </div>

          {selectedImages.length > 0 && (
            <div className="space-y-2">
              <Label>Imagens Selecionadas</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {selectedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <div className="border rounded-lg p-2 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs truncate">{image.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeImage(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Análise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Análise</Label>
            <Select value={analysisType} onValueChange={(value) => setAnalysisType(value as VisionAnalysisType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de análise" />
              </SelectTrigger>
              <SelectContent>
                {analysisTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center space-x-2">
                      <type.icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt Personalizado (Opcional)</Label>
            <Textarea
              id="prompt"
              placeholder="Descreva o que você quer que seja analisado especificamente..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleAnalysis}
            disabled={isProcessing || selectedImages.length === 0}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analisando...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Analisar Imagens
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Result */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Resultado da Análise</span>
              <Badge variant="outline">
                {analysisTypes.find(t => t.value === analysisResult.analysisType)?.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formatAnalysisResult(analysisResult)}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIVisionProcessor;
