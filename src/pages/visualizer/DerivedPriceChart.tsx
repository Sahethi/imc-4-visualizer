import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { Text } from '@mantine/core';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';
import { VisualizerCard } from './VisualizerCard.tsx';

export interface DerivedTerm {
  coefficient: number;
  symbol: string;
}

export interface DerivedPriceChartProps {
  terms: DerivedTerm[];
}

function formatTitle(terms: DerivedTerm[]): string {
  if (terms.length === 0) return 'Derived Price';

  return terms
    .map((term, i) => {
      const abs = Math.abs(term.coefficient);
      const sign = term.coefficient < 0 ? (i === 0 ? '−' : ' − ') : i === 0 ? '' : ' + ';
      const coeffStr = abs === 1 ? '' : `${abs} × `;
      return `${sign}${coeffStr}${term.symbol}`;
    })
    .join('');
}

export function DerivedPriceChart({ terms }: DerivedPriceChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  if (terms.length === 0) {
    return (
      <VisualizerCard title="Derived Price">
        <Text c="dimmed">Add terms in the cell editor to build a derived price series.</Text>
      </VisualizerCard>
    );
  }

  // Build symbol → timestamp → midPrice lookup from activityLogs
  const priceMap = new Map<string, Map<number, number>>();

  for (const row of algorithm.activityLogs) {
    if (row.midPrice === 0) continue;
    if (!priceMap.has(row.product)) {
      priceMap.set(row.product, new Map());
    }
    priceMap.get(row.product)!.set(row.timestamp, row.midPrice);
  }

  const symbolMaps = terms.map(t => priceMap.get(t.symbol) ?? new Map<number, number>());

  // Union of all timestamps across selected symbols
  const allTimestamps = new Set<number>();
  for (const m of symbolMaps) {
    for (const ts of m.keys()) allTimestamps.add(ts);
  }

  const data: [number, number][] = [];

  for (const ts of [...allTimestamps].sort((a, b) => a - b)) {
    // Only plot where every term has a price
    if (!symbolMaps.every(m => m.has(ts))) continue;

    let value = 0;
    for (let i = 0; i < terms.length; i++) {
      value += terms[i].coefficient * symbolMaps[i].get(ts)!;
    }

    data.push([ts, value]);
  }

  const title = formatTitle(terms);

  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: 'line',
      name: title,
      color: '#6366f1',
      marker: { enabled: false },
      data,
      dataGrouping: { enabled: false },
    },
  ];

  return (
    <Chart
      title={title}
      options={{ yAxis: { title: { text: 'Value' }, allowDecimals: true } }}
      series={series}
    />
  );
}
