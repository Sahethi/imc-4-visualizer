import Highcharts from 'highcharts';
import { Group, NumberInput, Select, Text } from '@mantine/core';
import { ReactNode, useState } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { bsGreeks, impliedVol } from '../../utils/blackScholes.ts';
import { Chart } from './Chart.tsx';

interface Props {
  vevSymbols: ProsperitySymbol[];
  underlyingSymbol: ProsperitySymbol;
}

export function OptionsGreeksChart({ vevSymbols, underlyingSymbol }: Props): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const [round, setRound] = useState(3);
  const [selectedSymbol, setSelectedSymbol] = useState(vevSymbols[0] ?? '');

  const strike = parseInt(selectedSymbol.replace(/^VEV_/, ''), 10);

  // Build underlying price map
  const underlyingPrice = new Map<number, number>();
  for (const row of algorithm.activityLogs) {
    if (row.product === underlyingSymbol) {
      underlyingPrice.set(row.timestamp, row.midPrice);
    }
  }

  // Compute greeks at each timestamp for the selected symbol
  const deltaData: { x: number; y: number }[] = [];
  const gammaData: { x: number; y: number; custom: { v: number } }[] = [];
  const vegaData: { x: number; y: number; custom: { v: number } }[] = [];
  const thetaData: { x: number; y: number; custom: { v: number } }[] = [];

  for (const row of algorithm.activityLogs) {
    if (row.product !== selectedSymbol) continue;
    const S = underlyingPrice.get(row.timestamp);
    if (S == null || S <= 0) continue;

    const tteStart = 8 - round;
    const T = Math.max(tteStart - row.timestamp / 100000, 1e-4);
    const iv = impliedVol(row.midPrice, S, strike, T);
    if (iv == null) continue;

    const g = bsGreeks(S, strike, T, iv);

    deltaData.push({ x: row.timestamp, y: g.delta });
    // Gamma, Vega, Theta shown via tooltip only (y=delta so axis range unaffected)
    gammaData.push({ x: row.timestamp, y: g.delta, custom: { v: g.gamma } });
    vegaData.push({ x: row.timestamp, y: g.delta, custom: { v: g.vega } });
    thetaData.push({ x: row.timestamp, y: g.delta, custom: { v: g.theta } });
  }

  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: 'line',
      name: 'Delta',
      color: '#3b82f6',
      marker: { enabled: false },
      data: deltaData,
      lineWidth: 2,
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Gamma',
      color: 'transparent',
      marker: { enabled: false },
      data: gammaData as any,
      lineWidth: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          const c = (this as any).custom;
          if (c == null) return '';
          return `<span style="color:#f59e0b">●</span> Gamma: <b>${c.v.toFixed(6)}</b><br/>`;
        },
      },
    },
    {
      type: 'line',
      name: 'Vega',
      color: 'transparent',
      marker: { enabled: false },
      data: vegaData as any,
      lineWidth: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          const c = (this as any).custom;
          if (c == null) return '';
          return `<span style="color:#22c55e">●</span> Vega: <b>${c.v.toFixed(2)}</b><br/>`;
        },
      },
    },
    {
      type: 'line',
      name: 'Theta',
      color: 'transparent',
      marker: { enabled: false },
      data: thetaData as any,
      lineWidth: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          const c = (this as any).custom;
          if (c == null) return '';
          return `<span style="color:#f43f5e">●</span> Theta/day: <b>${c.v.toFixed(4)}</b><br/>`;
        },
      },
    },
  ];

  const controls = (
    <Group gap="md" wrap="nowrap">
      <Group gap={4} wrap="nowrap">
        <Text size="sm">Voucher</Text>
        <Select
          data={vevSymbols}
          value={selectedSymbol}
          onChange={v => v && setSelectedSymbol(v)}
          size="xs"
          w={130}
        />
      </Group>
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
    </Group>
  );

  return (
    <Chart
      title={`Greeks — ${selectedSymbol} (Delta on axis, others in tooltip)`}
      series={series}
      min={0}
      max={1}
      controls={controls}
    />
  );
}
