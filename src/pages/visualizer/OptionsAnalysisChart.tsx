import Highcharts from 'highcharts';
import { Group, MultiSelect, NumberInput, Select, Text } from '@mantine/core';
import { ReactNode, useMemo, useState } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { bsGreeks, impliedVol } from '../../utils/blackScholes.ts';
import { Chart } from './Chart.tsx';

type XAxisType = 'timestamp' | 'moneyness';
type YAxisType = 'iv' | 'delta' | 'gamma' | 'vega' | 'theta' | 'midPrice' | 'bidPrice' | 'askPrice';

const Y_LABEL: Record<YAxisType, string> = {
  iv: 'Implied Volatility (ann. %)',
  delta: 'Delta',
  gamma: 'Gamma',
  vega: 'Vega',
  theta: 'Theta / day',
  midPrice: 'Mid Price',
  bidPrice: 'Bid Price',
  askPrice: 'Ask Price',
};

const COLORS = [
  '#f43f5e', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#14b8a6', '#a78bfa',
];

interface Props {
  vevSymbols: ProsperitySymbol[];
  underlyingSymbol: ProsperitySymbol;
  defaultXAxis?: XAxisType;
  defaultYAxis?: YAxisType;
}

export function OptionsAnalysisChart({
  vevSymbols,
  underlyingSymbol,
  defaultXAxis = 'timestamp',
  defaultYAxis = 'iv',
}: Props): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const [xAxis, setXAxis] = useState<XAxisType>(defaultXAxis);
  const [yAxis, setYAxis] = useState<YAxisType>(defaultYAxis);
  const [round, setRound] = useState(3);
  const [activeSymbols, setActiveSymbols] = useState<string[]>(vevSymbols);

  const underlyingPrice = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of algorithm.activityLogs) {
      if (row.product === underlyingSymbol) {
        map.set(row.timestamp, row.midPrice);
      }
    }
    return map;
  }, [algorithm.activityLogs, underlyingSymbol]);

  const series = useMemo((): Highcharts.SeriesOptionsType[] => {
    return activeSymbols.map(symbol => {
      const strike = parseInt(symbol.replace(/^VEV_/, ''), 10);
      const colorIdx = vevSymbols.indexOf(symbol);
      const color = COLORS[colorIdx % COLORS.length];
      const data: { x: number; y: number }[] = [];

      for (const row of algorithm.activityLogs) {
        if (row.product !== symbol) continue;
        const S = underlyingPrice.get(row.timestamp);
        if (S == null || S <= 0) continue;

        // TTE: tteStart decreases by 1 per day; within a day it decreases by timestamp/100000
        const T = Math.max(8 - round - row.day - row.timestamp / 100000, 1e-4);

        const xVal = xAxis === 'moneyness' ? S / strike : row.timestamp;
        let yVal: number | null = null;

        switch (yAxis) {
          case 'midPrice':
            yVal = row.midPrice;
            break;
          case 'bidPrice':
            yVal = row.bidPrices[0] ?? null;
            break;
          case 'askPrice':
            yVal = row.askPrices[0] ?? null;
            break;
          default: {
            const iv = impliedVol(row.midPrice, S, strike, T);
            if (iv == null) continue;
            if (yAxis === 'iv') {
              yVal = iv * Math.sqrt(365) * 100;
            } else {
              const g = bsGreeks(S, strike, T, iv);
              yVal = g[yAxis as 'delta' | 'gamma' | 'vega' | 'theta'];
            }
          }
        }

        if (yVal == null) continue;
        data.push({ x: xVal, y: yVal });
      }

      if (xAxis === 'moneyness') {
        data.sort((a, b) => a.x - b.x);
      }

      return {
        type: xAxis === 'moneyness' ? 'scatter' : 'line',
        name: symbol,
        color,
        marker: { enabled: xAxis === 'moneyness', radius: 2 },
        lineWidth: xAxis === 'moneyness' ? 0 : 1,
        data,
        dataGrouping: { enabled: xAxis === 'timestamp' },
      } as Highcharts.SeriesOptionsType;
    });
  }, [algorithm.activityLogs, activeSymbols, vevSymbols, underlyingPrice, xAxis, yAxis, round]);

  const chartOptions: Highcharts.Options =
    xAxis === 'moneyness'
      ? {
          xAxis: {
            type: 'linear',
            title: { text: 'Moneyness (S / K)' },
            crosshair: { width: 1 },
            labels: {
              formatter() {
                return Number(this.value).toFixed(3);
              },
            },
          },
          plotOptions: { series: { dataGrouping: { enabled: false } } },
        }
      : {};

  const tooltipHeader =
    xAxis === 'moneyness' ? (x: number) => `Moneyness ${x.toFixed(4)}<br/>` : undefined;

  const yLabel = Y_LABEL[yAxis];
  const xLabel = xAxis === 'timestamp' ? 'Timestamp' : 'Moneyness (S/K)';

  const controls = (
    <Group gap="md" wrap="wrap">
      <Group gap={4} wrap="nowrap">
        <Text size="sm">X axis</Text>
        <Select
          data={[
            { value: 'timestamp', label: 'Timestamp' },
            { value: 'moneyness', label: 'Moneyness (S/K)' },
          ]}
          value={xAxis}
          onChange={v => v && setXAxis(v as XAxisType)}
          size="xs"
          w={160}
        />
      </Group>
      <Group gap={4} wrap="nowrap">
        <Text size="sm">Y axis</Text>
        <Select
          data={Object.entries(Y_LABEL).map(([value, label]) => ({ value, label }))}
          value={yAxis}
          onChange={v => v && setYAxis(v as YAxisType)}
          size="xs"
          w={220}
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
      <Group gap={4} wrap="nowrap">
        <Text size="sm">Vouchers</Text>
        <MultiSelect
          data={vevSymbols}
          value={activeSymbols}
          onChange={setActiveSymbols}
          size="xs"
          w={260}
          maxDropdownHeight={200}
        />
      </Group>
    </Group>
  );

  return (
    <Chart
      title={`${yLabel} vs ${xLabel}`}
      series={series}
      options={chartOptions}
      tooltipHeaderFormatter={tooltipHeader}
      controls={controls}
    />
  );
}
