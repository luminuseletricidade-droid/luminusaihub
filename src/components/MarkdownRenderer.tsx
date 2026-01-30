
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground ${className}`}>
      <ReactMarkdown
        components={{
          // Customize heading styles
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-foreground mb-4 mt-6 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-foreground mb-3 mt-5 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-foreground mb-2 mt-4 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-foreground mb-2 mt-3 first:mt-0">{children}</h4>
          ),
          // Customize paragraph styles
          p: ({ children }) => (
            <p className="text-foreground mb-3 last:mb-0 leading-relaxed">{children}</p>
          ),
          // Customize strong/bold text
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          // Customize emphasis/italic text
          em: ({ children }) => (
            <em className="italic text-foreground/90">{children}</em>
          ),
          // Customize code blocks
          code: ({ children, className }) => {
            const inline = !className;
            return inline ? (
              <code className="bg-muted/60 px-1.5 py-0.5 rounded text-xs font-mono text-foreground border border-border/40">
                {children}
              </code>
            ) : (
              <pre className="bg-muted/40 p-4 rounded-lg border border-border/40 overflow-x-auto my-4">
                <code className="text-sm font-mono text-foreground block">
                  {children}
                </code>
              </pre>
            );
          },
          // Customize pre blocks
          pre: ({ children }) => (
            <div className="bg-muted/40 p-4 rounded-lg border border-border/40 overflow-x-auto my-4">
              {children}
            </div>
          ),
          // Customize lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 text-foreground mb-4 ml-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 text-foreground mb-4 ml-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground leading-relaxed">{children}</li>
          ),
          // Customize links
          a: ({ children, href }) => (
            <a 
              href={href} 
              className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Customize blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/40 pl-4 py-2 bg-muted/30 rounded-r-lg text-foreground/90 italic my-4">
              {children}
            </blockquote>
          ),
          // Customize horizontal rules
          hr: () => (
            <hr className="border-border/40 my-6" />
          ),
          // Customize tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-border/40 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/40">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-background/50">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border/20">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-foreground border-r border-border/20 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-foreground border-r border-border/20 last:border-r-0">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
