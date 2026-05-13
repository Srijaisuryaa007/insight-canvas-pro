import { Copy, RefreshCw, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "@/types";
import { useState } from "react";

interface Props {
  message: Message;
  streaming?: boolean;
  onRegenerate?: () => void;
}

export function MessageBubble({ message, streaming, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={"group flex gap-3 px-6 py-4 " + (isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-md bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
        </div>
      )}
      <div className={"max-w-[80%] " + (isUser ? "order-1" : "")}>
        {isUser ? (
          <div className="bg-elevated rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-text whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className={"markdown text-sm text-text " + (streaming ? "cursor" : "")}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }: any) {
                  const m = /language-(\w+)/.exec(className || "");
                  if (inline || !m) return <code className={className} {...props}>{children}</code>;
                  return (
                    <SyntaxHighlighter PreTag="div" language={m[1]} style={vscDarkPlus} customStyle={{ margin: 0, fontSize: 12 }}>
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                },
              }}
            >
              {message.content || (streaming ? "" : "*(empty)*")}
            </ReactMarkdown>
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
          <button onClick={copy} className="text-[10px] text-muted hover:text-text inline-flex items-center gap-1">
            <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
          </button>
          {!isUser && onRegenerate && !streaming && (
            <button onClick={onRegenerate} className="text-[10px] text-muted hover:text-text inline-flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Regenerate
            </button>
          )}
          {message.tokens && <span className="text-[10px] text-muted">{message.tokens} tok</span>}
        </div>
      </div>
      {isUser && (
        <div className="h-7 w-7 rounded-md bg-elevated border border-border flex items-center justify-center shrink-0 order-2">
          <User className="h-3.5 w-3.5 text-muted" />
        </div>
      )}
    </div>
  );
}
