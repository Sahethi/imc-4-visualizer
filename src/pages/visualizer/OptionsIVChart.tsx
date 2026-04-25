import Highcharts from 'highcharts';
import { Group, NumberInput, Text } from '@mantine/core';
import { ReactNode, useState } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { bsGreeks, impliedVol } from '../../utils/blackScholes.ts';
import { Chart } from './Chart.tsx';

interface Props {
  vevSymbols: ProsperitySymbol[];
  underlyingSymbol: ProsperitySymbol;
  selectedSymbols?: ProsperitySymbol[];
}

interface IVPoint {
  x: number;
  y: number;
  custom: {
    iv: number;
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
  };
}

const COLORS = [
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#a78bfa',
];

export function OptionsIVChart({ vevSymbols, underlyingSymbol, selectedSymbols }: Props): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const [round, setRound] = useState(3);

  const activeSymbols = selectedSymbols?.length ? selectedSymbols : vevSymbols;

  // Build underlying price map: timestamp -> midPrice
  const underlyingPrice = new Map<number, number>();
  for (const row of algorithm.activityLogs) {
    if (row.product === underlyingSymbol) {
      underlyingPrice.set(row.timestamp, row.midPrice);
    }
  }

  const series: Highcharts.SeriesOptionsType[] = activeSymbols.map((symbol, idx) => {
    const strike = parseInt(symbol.replace(/^VEV_/, ''), 10);
    const data: IVPoint[] = [];

    for (const row of algorithm.activityLogs) {
      if (row.product !== symbol) continue;
      const S = underlyingPrice.get(row.timestamp);
      if (S == null || S <= 0) continue;

      // TTE decreases linearly within the round; each round = 100,000 timestamp units
      const tteStart = 8 - round;
      const T = Math.max(tteStart - row.timestamp / 100000, 1e-4);

      const iv = impliedVol(row.midPrice, S, strike, T);
      if (iv == null) continue;

      const greeks = bsGreeks(S, strike, T, iv);

      // Annualise: multiply daily vol by sqrt(365)
      data.push({
        x: row.timestamp,
        y: iv * Math.sqrt(365),
        custom: {
          iv,
          delta: greeks.delta,
          gamma: greeks.gamma,
          vega: greeks.vega,
          theta: greeks.theta,
        },
      });
    }

    return {
      type: 'line',
      name: symbol,
      color: COLORS[idx % COLORS.length],
      marker: { enabled: false },
      data,
      lineWidth: 1,
      dataGrouping: { enabled: false },
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          const c = (this as any).custom;
          if (c == null) return '';

          const annualizedIVPct = this.y != null ? this.y * 100 : 0;
          return (
            [
              `<span style="color:${this.color}">●</span> ${this.series.name}: <b>${annualizedIVPct.toFixed(2)}%</b>`,
              `<span style="color:#3b82f6">●</span> Delta: <b>${c.delta.toFixed(4)}</b>`,
              `<span style="color:#f59e0b">●</span> Gamma: <b>${c.gamma.toFixed(6)}</b>`,
              `<span style="color:#22c55e">●</span> Vega: <b>${c.vega.toFixed(2)}</b>`,
              `<span style="color:#f43f5e">●</span> Theta/day: <b>${c.theta.toFixed(4)}</b>`,
            ].join('<br/>') + '<br/>'
          );
        },
      },
    } as Highcharts.SeriesOptionsType;
  });

  const controls = (
    <Group gap={4} wrap="nowrap">
      <Text size="sm">Round</Text>
      <NumberInput
        value={round}
        onChange={v => typeof v === 'number' && v >= 0 && v <= 7 && setRound(v)}
        min={0}
        max={7}
        size="xs"
        w={52}
      />
    </Group>
  );

  return (
    <Chart
      title="Implied Volatility (annualised)"
      options={{ yAxis: { title: { text: 'Implied Volatility (%)' } } }}
      series={series}
      controls={controls}
    />
  );
}
