import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// MarkdownMessage — renders AI responses with full GFM markdown support
//
// Features: bold, italic, lists, tables, blockquotes, inline code,
//           fenced code blocks with syntax highlighting + copy button
// ─────────────────────────────────────────────────────────────────────────────

interface MarkdownMessageProps {
  content: string;
  accentColor?: string;
  className?: string;
}

// ── Code block with language label + copy button ──────────────────────────────
function CodeBlock({
  language,
  value,
}: {
  language: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div
      className="my-3 rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Code block header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-[10px] font-mono font-medium text-slate-500">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {copied
            ? <><Check size={10} className="text-emerald-400" /> Скопировано</>
            : <><Copy size={10} /> Копировать</>
          }
        </button>
      </div>

      {/* Syntax-highlighted code */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '12px 14px',
          background: 'rgba(0,0,0,0.35)',
          fontSize: '12px',
          lineHeight: '1.6',
        }}
        wrapLongLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MarkdownMessage({ content, accentColor = '#6366f1', className }: MarkdownMessageProps) {
  return (
    <div className={cn('markdown-body text-sm leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-slate-100 mt-3 mb-1.5 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-slate-100 mt-3 mb-1 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1 first:mt-0">{children}</h3>
          ),

          // Paragraph
          p: ({ children }) => (
            <p className="text-slate-300 leading-relaxed mb-2 last:mb-0">{children}</p>
          ),

          // Bold / italic
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-100">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-300">{children}</em>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="my-2 pl-4 space-y-0.5 list-none">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 pl-4 space-y-0.5 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex gap-2 text-slate-300 text-sm leading-relaxed">
              <span
                className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: accentColor + '99' }}
              />
              <span>{children}</span>
            </li>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote
              className="my-2 pl-3 py-0.5 rounded-r-lg text-slate-400 italic"
              style={{ borderLeft: `2px solid ${accentColor}60` }}
            >
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-3 border-white/[0.08]" />
          ),

          // Inline code
          code: ({ children, className: langClass }) => {
            const match = /language-(\w+)/.exec(langClass ?? '');
            const isBlock = !!match;
            const value = String(children).replace(/\n$/, '');

            if (isBlock) {
              return (
                <CodeBlock
                  language={match![1]}
                  value={value}
                />
              );
            }
            // Inline
            return (
              <code
                className="px-1.5 py-0.5 rounded text-[11px] font-mono"
                style={{
                  background: `${accentColor}18`,
                  color: accentColor,
                  border: `1px solid ${accentColor}25`,
                }}
              >
                {children}
              </code>
            );
          },

          // Table
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-300">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-slate-400 border-t border-white/[0.04]">{children}</td>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: accentColor }}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
