import React from 'react';
import { cn } from '@/lib/utils';

interface FormattedMessageProps {
  content: string;
  className?: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, className }) => {
  // Remove markdown e formata o texto
  const formatContent = (text: string) => {
    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, '').trim();
      return code;
    });
    
    // Remove inline code
    text = text.replace(/`([^`]+)`/g, '$1');
    
    // Converte headers em texto com quebra de linha
    text = text.replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n');
    
    // Converte bold
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/__(.+?)__/g, '$1');
    
    // Converte italic
    text = text.replace(/\*([^\*]+)\*/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');
    
    // Remove links mas mantém o texto
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    
    // Converte listas não ordenadas
    text = text.replace(/^\s*[-*+]\s+(.+)$/gm, '• $1');
    
    // Converte listas ordenadas
    text = text.replace(/^\s*\d+\.\s+(.+)$/gm, (match, p1, offset, string) => {
      const lines = string.substring(0, offset).split('\n');
      const currentLineIndex = lines.length;
      const previousLines = lines.slice(-5); // Olha até 5 linhas atrás
      let listNumber = 1;
      
      for (let i = previousLines.length - 1; i >= 0; i--) {
        if (/^\s*\d+\.\s+/.test(previousLines[i])) {
          listNumber++;
        } else if (previousLines[i].trim() !== '') {
          break;
        }
      }
      
      return `${listNumber}. ${p1}`;
    });
    
    // Remove blockquotes
    text = text.replace(/^>\s+(.+)$/gm, '$1');
    
    // Remove separadores horizontais
    text = text.replace(/^---+$/gm, '');
    text = text.replace(/^\*\*\*+$/gm, '');
    
    // Limpa espaços extras
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    
    return text;
  };

  const formattedContent = formatContent(content);

  // Função para quebrar texto longo em parágrafos menores
  const breakLongText = (text: string): string[] => {
    const maxLength = 300; // Máximo de caracteres por parágrafo
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const paragraphs: string[] = [];
    let currentParagraph = '';
    
    sentences.forEach(sentence => {
      if ((currentParagraph + sentence).length > maxLength && currentParagraph) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = sentence;
      } else {
        currentParagraph += sentence;
      }
    });
    
    if (currentParagraph) {
      paragraphs.push(currentParagraph.trim());
    }
    
    return paragraphs;
  };

  // Divide o conteúdo em parágrafos e listas
  const renderContent = () => {
    const lines = formattedContent.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let isOrderedList = false;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Verifica se é item de lista
      if (trimmedLine.startsWith('• ')) {
        if (isOrderedList && currentList.length > 0) {
          // Fecha lista ordenada anterior
          elements.push(
            <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-2 my-3">
              {currentList.map((item, i) => (
                <li key={i} className="leading-relaxed">{item}</li>
              ))}
            </ol>
          );
          currentList = [];
        }
        isOrderedList = false;
        currentList.push(trimmedLine.substring(2));
      } else if (/^\d+\.\s/.test(trimmedLine)) {
        if (!isOrderedList && currentList.length > 0) {
          // Fecha lista não ordenada anterior
          elements.push(
            <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-3">
              {currentList.map((item, i) => (
                <li key={i} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          );
          currentList = [];
        }
        isOrderedList = true;
        currentList.push(trimmedLine.replace(/^\d+\.\s/, ''));
      } else {
        // Não é item de lista
        if (currentList.length > 0) {
          // Fecha lista atual
          if (isOrderedList) {
            elements.push(
              <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
                {currentList.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            );
          } else {
            elements.push(
              <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
                {currentList.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );
          }
          currentList = [];
          isOrderedList = false;
        }
        
        // Adiciona parágrafo se não estiver vazio
        if (trimmedLine) {
          // Quebra textos longos em parágrafos menores
          if (trimmedLine.length > 300) {
            const brokenParagraphs = breakLongText(trimmedLine);
            brokenParagraphs.forEach((paragraph, pIndex) => {
              elements.push(
                <p key={`p-${index}-${pIndex}`} className="mb-3">
                  {paragraph}
                </p>
              );
            });
          } else {
            elements.push(
              <p key={`p-${index}`} className="mb-3">
                {trimmedLine}
              </p>
            );
          }
        }
      }
    });
    
    // Fecha lista pendente
    if (currentList.length > 0) {
      if (isOrderedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
            {currentList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
            {currentList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }
    }
    
    return elements;
  };

  return (
    <div className={cn("text-sm leading-relaxed space-y-2", className)}>
      {renderContent()}
    </div>
  );
};