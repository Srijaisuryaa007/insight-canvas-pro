import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, ReferenceLine, ReferenceArea,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { formatNum } from '@/lib/formatters';
import type { Finding, DataRow } from '@/lib/insightEngine';

interface Props {
  finding: Finding;
  data: DataRow[];
}

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
};

export default function InsightMiniChart({ finding, data }: Props) {
  const chartData = useMemo(() => {
    switch (finding.type) {
      case 'trend': {
        return data.map((r, i) => ({ i, v: num(r[finding.col]) })).slice(0, 200);
      }
      case 'anomaly': {
        return data.map((r, i) => {
          const v = num(r[finding.col]);
          const dev = Math.abs(v - finding.mean);
          const isOut = dev > 2 * finding.stdDev;
          return { i, v, isOut };
        });
      }
      case 'correlation': {
        return data.map((r) => ({
          x: num(r[finding.col1]),
          y: num(r[finding.col2]),
        })).filter((p) => !(p.x === 0 && p.y === 0));
      }
      case 'ranking': {
        return finding.top5.map((t) => ({ name: t.name.slice(0, 12), value: t.value }));
      }
      case 'distribution': {
        const xs = data.map((r) => num(r[finding.col])).filter((v) => v !== 0);
        if (!xs.length) return [];
        const min = Math.min(...xs);
        const max = Math.max(...xs);
        const buckets = 10;
        const step = (max - min) / buckets || 1;
        const out = Array.from({ length: buckets }, (_, i) => ({
          bin: `${formatNum(min + i * step)}`,
          count: 0,
          mid: min + i * step + step / 2,
        }));
        xs.forEach((v) => {
          const idx = Math.min(buckets - 1, Math.floor((v - min) / step));
          out[idx].count++;
        });
        return out;
      }
    }
  }, [finding, data]);

  const height = 160;

  if (finding.type === 'trend') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData as { i: number; v: number }[]}>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', fontSize: 12 }} />
          <Line type="monotone" dataKey="v" stroke="#7C3AED" strokeWidth={2} dot={false} animationDuration={800} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (finding.type === 'anomaly') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <XAxis dataKey="i" hide />
          <YAxis dataKey="v" hide />
          <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', fontSize: 12 }} />
          <ReferenceLine y={finding.mean + 2 * finding.stdDev} stroke="#F59E0B" strokeDasharray="3 3" />
          <ReferenceLine y={finding.mean + 3 * finding.stdDev} stroke="#EF4444" strokeDasharray="3 3" />
          <ReferenceLine y={finding.mean - 2 * finding.stdDev} stroke="#F59E0B" strokeDasharray="3 3" />
          <Scatter data={chartData as { i: number; v: number; isOut: boolean }[]}>
            {(chartData as { isOut: boolean }[]).map((p, i) => (
              <Cell key={i} fill={p.isOut ? '#EF4444' : '#3B82F6'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
  if (finding.type === 'correlation') {
    const pts = chartData as { x: number; y: number }[];
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <XAxis dataKey="x" hide type="number" domain={['auto', 'auto']} />
          <YAxis dataKey="y" hide type="number" domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', fontSize: 12 }} />
          <ReferenceArea x1={minX} x2={maxX} fill="#7C3AED" fillOpacity={0.05} />
          <Scatter data={pts} fill="#7C3AED" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
  if (finding.type === 'ranking') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData as { name: string; value: number }[]} layout="vertical" margin={{ left: 60 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94A3B8' }} width={60} />
          <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', fontSize: 12 }} />
          <Bar dataKey="value" fill="#7C3AED" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  // distribution
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData as { bin: string; count: number }[]}>
        <XAxis dataKey="bin" hide />
        <YAxis hide />
        <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', fontSize: 12 }} />
        <ReferenceLine x={(chartData as { bin: string }[])[Math.floor((chartData as []).length / 2)]?.bin} stroke="#10B981" strokeDasharray="4 4" />
        <Bar dataKey="count" fill="#3B82F6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
