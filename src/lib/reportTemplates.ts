// DataPulse Report Templates

export type TemplateId = 'executive' | 'analyst' | 'storytelling' | 'operational' | 'investor' | 'academic';

export type TemplateTone = 'executive' | 'technical' | 'narrative' | 'operational' | 'bold' | 'academic';

export interface ReportTemplate {
  id: TemplateId;
  name: string;
  tag: string;
  icon: string;
  colors: [string, string];
  textColor: string;
  slides: string;
  description: string;
  tone: TemplateTone;
  slideCount: number;
}

export const TEMPLATES: ReportTemplate[] = [
  {
    id: 'executive',
    name: 'Executive Boardroom',
    tag: 'Best for: C-suite presentations',
    icon: '👔',
    colors: ['#0a1628', '#c9a227'],
    textColor: '#ffffff',
    slides: '6–8 slides',
    description: 'Minimal, high-impact. KPIs and decisions first.',
    tone: 'executive',
    slideCount: 8,
  },
  {
    id: 'analyst',
    name: 'Analyst Deep Dive',
    tag: 'Best for: Technical teams',
    icon: '🔬',
    colors: ['#1a3a6b', '#ffffff'],
    textColor: '#ffffff',
    slides: '10–15 slides',
    description: 'Dense, comprehensive. Full statistical analysis.',
    tone: 'technical',
    slideCount: 12,
  },
  {
    id: 'storytelling',
    name: 'Business Storytelling',
    tag: 'Best for: Stakeholders',
    icon: '📖',
    colors: ['#667eea', '#764ba2'],
    textColor: '#ffffff',
    slides: '9 slides',
    description: 'Narrative arc. Data as a compelling story.',
    tone: 'narrative',
    slideCount: 9,
  },
  {
    id: 'operational',
    name: 'Operational Report',
    tag: 'Best for: Operations teams',
    icon: '⚙️',
    colors: ['#00875a', '#ffffff'],
    textColor: '#ffffff',
    slides: '7 slides',
    description: 'RAG status. Action items. Process metrics.',
    tone: 'operational',
    slideCount: 7,
  },
  {
    id: 'investor',
    name: 'Investor Pitch',
    tag: 'Best for: Fundraising',
    icon: '🚀',
    colors: ['#000000', '#0066ff'],
    textColor: '#ffffff',
    slides: '8 slides',
    description: 'Bold, striking. Growth story for investors.',
    tone: 'bold',
    slideCount: 8,
  },
  {
    id: 'academic',
    name: 'Academic Research',
    tag: 'Best for: Research papers',
    icon: '🎓',
    colors: ['#722f37', '#ffffff'],
    textColor: '#ffffff',
    slides: '9 slides',
    description: 'Formal. Methodology and statistical rigor.',
    tone: 'academic',
    slideCount: 9,
  },
];

export function getTemplate(id: TemplateId): ReportTemplate {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
}
