import Highcharts from 'highcharts';
import { Group, MultiSelect, NumberInput, Select, Text } from '@mantine/core';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityLogRow, ProsperitySymbol } from '../../models.ts';
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

const PRIMARY_AXIS_COLOR = '#3b82f6';
const SECONDARY_AXIS_COLOR = '#f97316';

function lightenHexColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const channels = [0, 2, 4].map(offset => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  const lightened = channels.map(channel => clamp(Math.round(channel + (255 - channel) * amount)));

  return `#${lightened.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}

interface Props {
  vevSymbols: ProsperitySymbol[];
  underlyingSymbol: ProsperitySymbol;
  defaultXAxis?: XAxisType;
  defaultYAxis?: YAxisType;
  defaultSecondaryYAxis?: YAxisType | null;
  defaultSymbols?: ProsperitySymbol[];
}

function getYValue(row: ActivityLogRow, S: number, strike: number, T: number, yAxis: YAxisType): number | null {
  switch (yAxis) {
    case 'midPrice':
      return row.midPrice;
    case 'bidPrice':
      return row.bidPrices[0] ?? null;
    case 'askPrice':
      return row.askPrices[0] ?? null;
    case 'iv': {
      const iv = impliedVol(row.midPrice, S, strike, T);
      return iv == null ? null : iv * Math.sqrt(365) * 100;
    }
    default: {
      const iv = impliedVol(row.midPrice, S, strike, T);
      if (iv == null) return null;
      const greeks = bsGreeks(S, strike, T, iv);
      return greeks[yAxis as 'delta' | 'gamma' | 'vega' | 'theta'];
    }
  }
}

export function OptionsAnalysisChart({
  vevSymbols,
  underlyingSymbol,
  defaultXAxis = 'timestamp',
  defaultYAxis = 'iv',
  defaultSecondaryYAxis = null,
  defaultSymbols,
}: Props): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const [xAxis, setXAxis] = useState<XAxisType>(defaultXAxis);
  const [yAxis, setYAxis] = useState<YAxisType>(defaultYAxis);
  const [secondaryYAxis, setSecondaryYAxis] = useState<YAxisType | null>(defaultSecondaryYAxis);
  const [round, setRound] = useState(3);
  const [activeSymbols, setActiveSymbols] = useState<string[]>(defaultSymbols?.length ? defaultSymbols : vevSymbols);

  useEffect(() => {
    setActiveSymbols(defaultSymbols?.length ? defaultSymbols : vevSymbols);
  }, [defaultSymbols, vevSymbols]);

  useEffect(() => {
    setSecondaryYAxis(defaultSecondaryYAxis);
  }, [defaultSecondaryYAxis]);

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
    const seriesList: Highcharts.SeriesOptionsType[] = [];

    for (const symbol of activeSymbols) {
      const strike = parseInt(symbol.replace(/^VEV_/, ''), 10);
      const colorIdx = vevSymbols.indexOf(symbol);
      const color = COLORS[colorIdx % COLORS.length];
      const secondaryColor = lightenHexColor(color, 0.35);
      const primaryData: { x: number; y: number }[] = [];
      const secondaryData: { x: number; y: number }[] = [];

      for (const row of algorithm.activityLogs) {
        if (row.product !== symbol) continue;
        const S = underlyingPrice.get(row.timestamp);
        if (S == null || S <= 0) continue;

        // TTE: tteStart decreases by 1 per day; within a day it decreases by timestamp/100000
        const T = Math.max(8 - round - row.day - row.timestamp / 100000, 1e-4);

        const xVal = xAxis === 'moneyness' ? S / strike : row.timestamp;
        const primary = getYValue(row, S, strike, T, yAxis);
        if (primary != null) {
          primaryData.push({ x: xVal, y: primary });
        }

        if (secondaryYAxis && secondaryYAxis !== yAxis) {
          const secondary = getYValue(row, S, strike, T, secondaryYAxis);
          if (secondary != null) {
            secondaryData.push({ x: xVal, y: secondary });
          }
        }
      }

      if (xAxis === 'moneyness') {
        primaryData.sort((a, b) => a.x - b.x);
        secondaryData.sort((a, b) => a.x - b.x);
      }

      seriesList.push({
        type: xAxis === 'moneyness' ? 'scatter' : 'line',
        name: symbol,
        color,
        marker: { enabled: xAxis === 'moneyness', radius: 2 },
        lineWidth: xAxis === 'moneyness' ? 0 : 1,
        data: primaryData,
        yAxis: 0,
        dataGrouping: { enabled: xAxis === 'timestamp' },
      } as Highcharts.SeriesOptionsType);

      if (secondaryYAxis && secondaryYAxis !== yAxis) {
        seriesList.push({
          type: xAxis === 'moneyness' ? 'scatter' : 'line',
          name: `${symbol} (${Y_LABEL[secondaryYAxis]})`,
          color: secondaryColor,
          dashStyle: 'ShortDash',
          marker: { enabled: xAxis === 'moneyness', radius: 2 },
          lineWidth: xAxis === 'moneyness' ? 0 : 1,
          data: secondaryData,
          yAxis: 1,
          dataGrouping: { enabled: xAxis === 'timestamp' },
        } as Highcharts.SeriesOptionsType);
      }
    }

    return seriesList;
  }, [algorithm.activityLogs, activeSymbols, vevSymbols, underlyingPrice, xAxis, yAxis, secondaryYAxis, round]);

  const yAxisOptions: Highcharts.Options['yAxis'] =
    secondaryYAxis && secondaryYAxis !== yAxis
      ? [
          {
            title: { text: Y_LABEL[yAxis], style: { color: PRIMARY_AXIS_COLOR } },
            labels: { style: { color: PRIMARY_AXIS_COLOR } },
            opposite: false,
            allowDecimals: true,
            lineColor: PRIMARY_AXIS_COLOR,
            tickColor: PRIMARY_AXIS_COLOR,
            gridLineColor: 'rgba(59, 130, 246, 0.12)',
          },
          {
            title: { text: Y_LABEL[secondaryYAxis], style: { color: SECONDARY_AXIS_COLOR } },
            labels: { style: { color: SECONDARY_AXIS_COLOR } },
            opposite: true,
            allowDecimals: true,
            lineColor: SECONDARY_AXIS_COLOR,
            tickColor: SECONDARY_AXIS_COLOR,
            gridLineColor: 'rgba(249, 115, 22, 0.12)',
          },
        ]
      : {
          title: { text: Y_LABEL[yAxis], style: { color: PRIMARY_AXIS_COLOR } },
          labels: { style: { color: PRIMARY_AXIS_COLOR } },
          opposite: false,
          allowDecimals: true,
          lineColor: PRIMARY_AXIS_COLOR,
          tickColor: PRIMARY_AXIS_COLOR,
        };

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
          yAxis: yAxisOptions,
          plotOptions: { series: { dataGrouping: { enabled: false } } },
        }
      : { yAxis: yAxisOptions };

  const tooltipHeader = xAxis === 'moneyness' ? (x: number) => `Moneyness ${x.toFixed(4)}<br/>` : undefined;

  const yLabel =
    secondaryYAxis && secondaryYAxis !== yAxis ? `${Y_LABEL[yAxis]} + ${Y_LABEL[secondaryYAxis]}` : Y_LABEL[yAxis];
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
        <Text size="sm">Secondary Y</Text>
        <Select
          data={[{ value: '', label: 'None' }, ...Object.entries(Y_LABEL).map(([value, label]) => ({ value, label }))]}
          value={secondaryYAxis ?? ''}
          onChange={v => setSecondaryYAxis((v as YAxisType) || null)}
          size="xs"
          w={220}
        />
      </Group>
      {secondaryYAxis && secondaryYAxis !== yAxis && (
        <Text size="sm" c="dimmed">
          Primary series are solid, secondary series are dashed and lighter to show the two axes.
        </Text>
      )}
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
