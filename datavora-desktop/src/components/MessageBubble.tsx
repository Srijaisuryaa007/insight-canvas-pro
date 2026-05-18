import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import type { Message } from '../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

// While streaming, dangling ``` should not flicker as a code block.
function sanitizeStreaming(content: string): string {
  const fences = (content.match(/```/g) ?? []).length;
  if (fences % 2 === 1) {
    // Close it as plain text by adding a placeholder close
    return content + '\n```';
  }
  return content;
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const lineCount = value.split('\n').length;
  return (
    <div className="relative my-3 rounded-lg overflow-hidden bg-[#1E293B]">
      <div className="flex items-center justify-between px-3 py-1 text-[11px] text-muted bg-black/30">
        <span className="font-mono uppercase tracking-wide">{language || 'text'}</span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 hover:text-text-base transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        showLineNumbers={lineCount > 5}
        customStyle={{ margin: 0, padding: '12px 14px', background: 'transparent', fontSize: '13px' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';
  const content = useMemo(
    () => (isStreaming ? sanitizeStreaming(message.content) : message.content),
    [message.content, isStreaming],
  );

  if (isUser) {
    return (
      <div className="ml-auto max-w-[80%] bg-surface-2 rounded-[18px_18px_4px_18px] px-4 py-3 whitespace-pre-wrap break-words">
        {message.attachments?.length ? (
          <div className="flex flex-wrap gap-1 mb-2">
            {message.attachments.map((a) => (
              <span
                key={a.name}
                className="text-[11px] bg-black/30 px-2 py-0.5 rounded-full text-muted"
                title={`${a.name} (${Math.round(a.size / 1024)}kb)`}
              >
                📎 {a.name}
              </span>
            ))}
          </div>
        ) : null}
        <div className="text-text-base">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="max-w-[90%]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const value = String(children).replace(/\n$/, '');
            if (inline) {
              return (
                <code className="bg-[#1E293B] px-1.5 py-0.5 rounded text-[0.9em] font-mono">
                  {children}
                </code>
              );
            }
            return <CodeBlock language={match?.[1] ?? ''} value={value} />;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="border-collapse">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="bg-[#1E293B] border-b border-accent px-3 py-2 text-left">{children}</th>;
          },
          td({ children }) {
            return <td className="border-b border-white/5 px-3 py-2">{children}</td>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-accent underline hover:text-accent-hover"
                onClick={async (e) => {
                  if (!href) return;
                  e.preventDefault();
                  try {
                    const { open } = await import('@tauri-apps/plugin-shell');
                    await open(href);
                  } catch {
                    window.open(href, '_blank', 'noreferrer');
                  }
                }}
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-[3px] border-accent pl-4 italic text-muted my-2">
                {children}
              </blockquote>
            );
          },
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2 pb-1 border-b border-border-soft">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mt-4 mb-2 pb-1 border-b border-border-soft">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mt-3 mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-bold mt-3 mb-1">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>,
          hr: () => <hr className="my-4 border-white/10" />,
          img: ({ src, alt }) => <img src={src} alt={alt} className="max-w-full rounded-lg my-2" />,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="cursor inline-block" />}
    </div>
  );
}
