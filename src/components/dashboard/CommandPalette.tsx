import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Upload,
  Shield,
  Lightbulb,
  Sparkles,
  BarChart3,
  Settings,
  FileText,
  Database,
  Download,
} from 'lucide-react';

interface CommandPaletteProps {
  onUploadDataset?: () => void;
  onRunQuality?: () => void;
  onGenerateInsights?: () => void;
  onAskCopilot?: () => void;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
}

export function CommandPalette({
  onUploadDataset,
  onRunQuality,
  onGenerateInsights,
  onAskCopilot,
  onExportCSV,
  onExportPDF,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          {onUploadDataset && (
            <CommandItem onSelect={() => runCommand(onUploadDataset)}>
              <Upload className="mr-2 h-4 w-4" />
              <span>Upload Dataset</span>
            </CommandItem>
          )}
          {onRunQuality && (
            <CommandItem onSelect={() => runCommand(onRunQuality)}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Run Quality Scan</span>
            </CommandItem>
          )}
          {onGenerateInsights && (
            <CommandItem onSelect={() => runCommand(onGenerateInsights)}>
              <Lightbulb className="mr-2 h-4 w-4" />
              <span>Generate Insights</span>
            </CommandItem>
          )}
          {onAskCopilot && (
            <CommandItem onSelect={() => runCommand(onAskCopilot)}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Ask Copilot</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Export">
          {onExportCSV && (
            <CommandItem onSelect={() => runCommand(onExportCSV)}>
              <Download className="mr-2 h-4 w-4" />
              <span>Export as CSV</span>
            </CommandItem>
          )}
          {onExportPDF && (
            <CommandItem onSelect={() => runCommand(onExportPDF)}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Export as PDF</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/datasets'))}>
            <Database className="mr-2 h-4 w-4" />
            <span>Datasets</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/quality'))}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Data Quality</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/insights'))}>
            <Lightbulb className="mr-2 h-4 w-4" />
            <span>Insights</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/visualizations'))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Visualizations</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/copilot'))}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>AI Copilot</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
