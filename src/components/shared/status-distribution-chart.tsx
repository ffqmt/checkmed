"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const TONE_COLOR: Record<string, string> = {
  neutral: "var(--color-status-neutral)",
  info: "var(--color-status-info)",
  success: "var(--color-status-success)",
  warning: "var(--color-status-warning)",
  danger: "var(--color-status-danger)",
};

export type StatusDistributionDatum = { label: string; count: number; tone: string };

export function StatusDistributionChart({ data }: { data: StatusDistributionDatum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados suficientes para exibir o gráfico.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }} barCategoryGap={10}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 4, 4]} maxBarSize={16}>
          {data.map((entry, index) => (
            <Cell key={index} fill={TONE_COLOR[entry.tone] ?? TONE_COLOR.neutral} />
          ))}
          <LabelList dataKey="count" position="right" style={{ fill: "var(--color-foreground)", fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
