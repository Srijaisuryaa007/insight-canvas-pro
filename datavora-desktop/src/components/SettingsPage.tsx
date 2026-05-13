import { useSettingsStore } from "@/stores/settingsStore";
import { useModelStore } from "@/stores/modelStore";

export function SettingsPage() {
  const s = useSettingsStore();
  const { installed } = useModelStore();

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <Section title="General">
        <Field label="Default model">
          <select value={s.defaultModel} onChange={(e) => s.set("defaultModel", e.target.value)} className="bg-elevated border border-border rounded-md px-2 py-1.5 text-sm">
            {installed.length ? installed.map((m) => <option key={m.name} value={m.name}>{m.name}</option>) : <option>{s.defaultModel}</option>}
          </select>
        </Field>
        <Field label={`Temperature (${s.temperature.toFixed(2)})`}>
          <input type="range" min={0} max={2} step={0.05} value={s.temperature} onChange={(e) => s.set("temperature", parseFloat(e.target.value))} className="w-64 accent-accent" />
        </Field>
        <Field label={`Context window (${s.contextWindow} tokens)`}>
          <input type="range" min={512} max={8192} step={256} value={s.contextWindow} onChange={(e) => s.set("contextWindow", parseInt(e.target.value))} className="w-64 accent-accent" />
        </Field>
        <Field label="System prompt" stacked>
          <textarea value={s.systemPrompt} onChange={(e) => s.set("systemPrompt", e.target.value)} rows={4} className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-sm" />
        </Field>
      </Section>

      <Section title="Appearance">
        <Field label={`Font size (${s.fontSize}px)`}>
          <input type="range" min={12} max={18} value={s.fontSize} onChange={(e) => s.set("fontSize", parseInt(e.target.value))} className="w-64 accent-accent" />
        </Field>
        <Field label="Density">
          <select value={s.density} onChange={(e) => s.set("density", e.target.value as any)} className="bg-elevated border border-border rounded-md px-2 py-1.5 text-sm">
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </Field>
        <Field label={`Sidebar width (${s.sidebarWidth}px)`}>
          <input type="range" min={220} max={320} value={s.sidebarWidth} onChange={(e) => s.set("sidebarWidth", parseInt(e.target.value))} className="w-64 accent-accent" />
        </Field>
      </Section>

      <Section title="Storage">
        <p className="text-xs text-muted">Conversations live in <code className="bg-elevated px-1.5 py-0.5 rounded">conversations.db</code> inside your app data directory.</p>
        <button onClick={() => { if (confirm("Reset all settings?")) s.reset(); }} className="text-xs px-3 py-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-400">
          Reset settings
        </button>
      </Section>

      <Section title="About">
        <p className="text-xs text-muted">DataVora Desktop · v1.0.0 · MIT License · Powered by Ollama, Tauri, React.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">{title}</h2>
      <div className="bg-surface border border-border rounded-lg p-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children, stacked }: { label: string; children: React.ReactNode; stacked?: boolean }) {
  return (
    <div className={stacked ? "" : "flex items-center justify-between gap-4"}>
      <label className="text-sm text-text">{label}</label>
      <div className={stacked ? "mt-2" : ""}>{children}</div>
    </div>
  );
}
