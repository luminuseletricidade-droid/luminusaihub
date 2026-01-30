import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface HTMLDocumentViewerProps {
  htmlContent: string;
  documentTitle: string;
  onClose?: () => void;
}

export const HTMLDocumentViewer: React.FC<HTMLDocumentViewerProps> = ({
  htmlContent,
  documentTitle,
  onClose
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string>('');

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  // Create blob URL for iframe to properly render HTML
  React.useEffect(() => {
    const fullHTML = htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')
      ? htmlContent
      : `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle}</title>
  <style>
    @media print {
      @page { margin: 2cm; }
      body { margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setIframeUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [htmlContent, documentTitle]);

  const handleDownloadPDF = async () => {
    if (!iframeRef.current?.contentDocument?.body) {
      toast({
        title: "Erro",
        description: "Conteúdo do documento não está disponível. Aguarde o carregamento completo.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPDF(true);

    try {
      toast({
        title: "Gerando PDF...",
        description: "Aguarde enquanto o documento é processado",
      });

      // Wait a bit to ensure iframe is fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));

      const iframeBody = iframeRef.current.contentDocument.body;

      // Create canvas from iframe content
      const canvas = await html2canvas(iframeBody, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: iframeBody.scrollWidth,
        windowHeight: iframeBody.scrollHeight
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
      const filename = `${documentTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`;

      // Save PDF
      pdf.save(filename);

      toast({
        title: "PDF gerado com sucesso!",
        description: `Arquivo salvo como ${filename}`,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: error instanceof Error ? error.message : "Não foi possível gerar o arquivo PDF",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <h3 className="text-lg font-semibold">{documentTitle}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Baixar PDF
              </>
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Fechar
            </Button>
          )}
        </div>
      </div>

      {/* Document Content */}
      <Card className="flex-1 m-4 overflow-hidden">
        <CardContent className="p-0 h-full">
          {iframeUrl ? (
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              className="w-full h-full border-0"
              title={documentTitle}
              sandbox="allow-same-origin allow-scripts"
              onLoad={() => console.log('✅ Iframe carregado')}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HTMLDocumentViewer;
