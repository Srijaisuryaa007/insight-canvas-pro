import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { extendedFormulaLibrary } from '@/lib/extendedFormulaLibrary';

export interface FormulaSnippet {
  id: string;
  name: string;
  type: 'dax' | 'sql' | 'excel';
  category: string;
  level: 'Intermediate' | 'Advanced' | 'Expert';
  formula: string;
  explanation: string;
  bestUsedFor: string[];
  columnsNeeded: string[];
  savedAt?: string;
}

interface FormulaContextType {
  library: FormulaSnippet[];
  saved: FormulaSnippet[];
  saveFormula: (snippet: FormulaSnippet) => void;
  removeFormula: (id: string) => void;
  getByType: (type: FormulaSnippet['type']) => FormulaSnippet[];
  getByCategory: (category: string) => FormulaSnippet[];
  search: (query: string) => FormulaSnippet[];
}

const FormulaContext = createContext<FormulaContextType | undefined>(undefined);

export const FormulaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [saved, setSaved] = useState<FormulaSnippet[]>(() => {
    try {
      const raw = localStorage.getItem('datavora-saved-formulas');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const library = useMemo<FormulaSnippet[]>(() => extendedFormulaLibrary as FormulaSnippet[], []);

  const persist = (next: FormulaSnippet[]) => {
    setSaved(next);
    try { localStorage.setItem('datavora-saved-formulas', JSON.stringify(next)); } catch {}
  };

  const saveFormula = useCallback((snippet: FormulaSnippet) => {
    const next = [{ ...snippet, savedAt: new Date().toISOString() }, ...saved.filter(s => s.id !== snippet.id)];
    persist(next);
  }, [saved]);

  const removeFormula = useCallback((id: string) => {
    persist(saved.filter(s => s.id !== id));
  }, [saved]);

  const getByType = useCallback((type: FormulaSnippet['type']) => library.filter(f => f.type === type), [library]);
  const getByCategory = useCallback((category: string) => library.filter(f => f.category === category), [library]);
  const search = useCallback((query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return library;
    return library.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.explanation.toLowerCase().includes(q) ||
      f.bestUsedFor.some(b => b.toLowerCase().includes(q))
    );
  }, [library]);

  return (
    <FormulaContext.Provider value={{ library, saved, saveFormula, removeFormula, getByType, getByCategory, search }}>
      {children}
    </FormulaContext.Provider>
  );
};

export const useFormulas = () => {
  const ctx = useContext(FormulaContext);
  if (!ctx) throw new Error('useFormulas must be used within FormulaProvider');
  return ctx;
};
