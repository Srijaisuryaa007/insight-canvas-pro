interface Props {
  modelName?: string;
}

export function TypingIndicator({ modelName }: Props) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex items-center gap-1">
        <span className="dot w-2 h-2 rounded-full bg-accent inline-block" />
        <span className="dot w-2 h-2 rounded-full bg-accent inline-block" />
        <span className="dot w-2 h-2 rounded-full bg-accent inline-block" />
      </div>
      <span className="text-xs italic text-muted">
        {modelName ? `${modelName} is thinking…` : 'Thinking…'}
      </span>
    </div>
  );
}
