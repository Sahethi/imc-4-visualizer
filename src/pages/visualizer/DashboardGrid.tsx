import { ActionIcon, Button, Grid, Group, Select, Stack } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import { ReactNode, useState } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { ConversionPriceChart } from './ConversionPriceChart.tsx';
import { EnvironmentChart } from './EnvironmentChart.tsx';
import { OptionsAnalysisChart } from './OptionsAnalysisChart.tsx';
import { PlainValueObservationChart } from './PlainValueObservationChart.tsx';
import { PositionChart } from './PositionChart.tsx';
import { ProductPriceChart } from './ProductPriceChart.tsx';
import { ProfitLossChart } from './ProfitLossChart.tsx';
import { SpreadChart } from './SpreadChart.tsx';
import { TransportChart } from './TransportChart.tsx';
import { VolumeChart } from './VolumeChart.tsx';

type CellType =
  | 'empty'
  | 'productPrice'
  | 'volume'
  | 'spread'
  | 'profitLoss'
  | 'position'
  | 'optionsAnalysis'
  | 'conversionPrice'
  | 'transport'
  | 'environment'
  | 'plainObservation';

export interface CellConfig {
  id: string;
  type: CellType;
  symbol: string;
  optionsXAxis?: 'timestamp' | 'moneyness';
  optionsYAxis?: string;
}

export interface RowConfig {
  id: string;
  left: CellConfig;
  right: CellConfig;
}

const CELL_TYPE_OPTIONS: { value: CellType; label: string }[] = [
  { value: 'empty', label: '— Empty —' },
  { value: 'productPrice', label: 'Price' },
  { value: 'volume', label: 'Volume' },
  { value: 'spread', label: 'Spread' },
  { value: 'profitLoss', label: 'Profit & Loss' },
  { value: 'position', label: 'Position' },
  { value: 'optionsAnalysis', label: 'Options Analysis' },
  { value: 'conversionPrice', label: 'Conversion Price' },
  { value: 'transport', label: 'Transport Fees' },
  { value: 'environment', label: 'Environment' },
  { value: 'plainObservation', label: 'Plain Observation' },
];

const SYMBOL_TYPES: CellType[] = [
  'productPrice',
  'volume',
  'spread',
  'conversionPrice',
  'transport',
  'environment',
  'plainObservation',
];

function makeCell(partial: Partial<CellConfig> = {}): CellConfig {
  return {
    id: crypto.randomUUID(),
    type: partial.type ?? 'empty',
    symbol: partial.symbol ?? '',
    optionsXAxis: partial.optionsXAxis,
    optionsYAxis: partial.optionsYAxis,
  };
}

export function makeRow(left: Partial<CellConfig> = {}, right: Partial<CellConfig> = {}): RowConfig {
  return { id: crypto.randomUUID(), left: makeCell(left), right: makeCell(right) };
}

export interface DashboardGridContext {
  allSymbols: ProsperitySymbol[];
  vevSymbols: ProsperitySymbol[];
  conversionProducts: Set<string>;
  plainValueSymbols: ProsperitySymbol[];
  underlyingSymbol: ProsperitySymbol;
}

function symbolsFor(type: CellType, ctx: DashboardGridContext): string[] {
  switch (type) {
    case 'conversionPrice':
    case 'transport':
    case 'environment':
      return ctx.allSymbols.filter(s => ctx.conversionProducts.has(s));
    case 'plainObservation':
      return ctx.plainValueSymbols;
    default:
      return ctx.allSymbols;
  }
}

function CellContent({ config, ctx }: { config: CellConfig; ctx: DashboardGridContext }): ReactNode {
  switch (config.type) {
    case 'productPrice':
      return config.symbol ? <ProductPriceChart symbol={config.symbol} /> : null;
    case 'volume':
      return config.symbol ? <VolumeChart symbol={config.symbol} /> : null;
    case 'spread':
      return config.symbol ? <SpreadChart symbol={config.symbol} /> : null;
    case 'profitLoss':
      return <ProfitLossChart symbols={ctx.allSymbols} />;
    case 'position':
      return <PositionChart symbols={ctx.allSymbols} />;
    case 'optionsAnalysis':
      return ctx.vevSymbols.length > 0 ? (
        <OptionsAnalysisChart
          vevSymbols={ctx.vevSymbols}
          underlyingSymbol={ctx.underlyingSymbol}
          defaultXAxis={(config.optionsXAxis as 'timestamp' | 'moneyness') ?? 'timestamp'}
          defaultYAxis={(config.optionsYAxis as any) ?? 'iv'}
        />
      ) : (
        <div style={{ padding: '1rem', opacity: 0.5, fontSize: 13 }}>
          No VEV voucher symbols found in this log.
        </div>
      );
    case 'conversionPrice':
      return config.symbol && ctx.conversionProducts.has(config.symbol) ? (
        <ConversionPriceChart symbol={config.symbol} />
      ) : null;
    case 'transport':
      return config.symbol && ctx.conversionProducts.has(config.symbol) ? (
        <TransportChart symbol={config.symbol} />
      ) : null;
    case 'environment':
      return config.symbol && ctx.conversionProducts.has(config.symbol) ? (
        <EnvironmentChart symbol={config.symbol} />
      ) : null;
    case 'plainObservation':
      return config.symbol ? <PlainValueObservationChart symbol={config.symbol} /> : null;
    default:
      return null;
  }
}

interface CellProps {
  config: CellConfig;
  ctx: DashboardGridContext;
  onChange: (config: CellConfig) => void;
}

function DashboardCell({ config, ctx, onChange }: CellProps): ReactNode {
  const needsSymbol = SYMBOL_TYPES.includes(config.type);
  const symbolList = symbolsFor(config.type, ctx).map(s => ({ value: s, label: s }));

  return (
    <Stack gap={4}>
      <Group gap="xs" wrap="nowrap">
        <Select
          data={CELL_TYPE_OPTIONS}
          value={config.type}
          onChange={v => {
            if (!v) return;
            const type = v as CellType;
            const syms = symbolsFor(type, ctx);
            const symbol = SYMBOL_TYPES.includes(type) ? (config.symbol && syms.includes(config.symbol) ? config.symbol : (syms[0] ?? '')) : '';
            onChange({ ...config, type, symbol });
          }}
          size="xs"
          w={170}
        />
        {needsSymbol && (
          <Select
            data={symbolList}
            value={config.symbol || (symbolList[0]?.value ?? null)}
            onChange={v => v && onChange({ ...config, symbol: v })}
            size="xs"
            w={190}
            placeholder="Symbol…"
          />
        )}
      </Group>
      <CellContent config={config} ctx={ctx} />
    </Stack>
  );
}

interface DashboardGridProps extends DashboardGridContext {
  initialRows: RowConfig[];
}

export function DashboardGrid({ initialRows, ...ctx }: DashboardGridProps): ReactNode {
  const [rows, setRows] = useState<RowConfig[]>(initialRows);

  const updateCell = (rowId: string, side: 'left' | 'right', config: CellConfig): void => {
    setRows(prev => prev.map(r => (r.id === rowId ? { ...r, [side]: config } : r)));
  };

  const removeRow = (rowId: string): void => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  const addRow = (): void => {
    setRows(prev => [...prev, makeRow()]);
  };

  return (
    <Stack gap="xl">
      {rows.map(row => (
        <Stack key={row.id} gap={4}>
          <Group justify="flex-end">
            <ActionIcon
              size="xs"
              variant="subtle"
              color="red"
              title="Remove row"
              onClick={() => removeRow(row.id)}
            >
              <IconX size={12} />
            </ActionIcon>
          </Group>
          <Grid gutter="md">
            <Grid.Col span={6}>
              <DashboardCell config={row.left} ctx={ctx} onChange={c => updateCell(row.id, 'left', c)} />
            </Grid.Col>
            <Grid.Col span={6}>
              <DashboardCell config={row.right} ctx={ctx} onChange={c => updateCell(row.id, 'right', c)} />
            </Grid.Col>
          </Grid>
        </Stack>
      ))}
      <Button variant="light" leftSection={<IconPlus size={14} />} onClick={addRow} w={130}>
        Add Row
      </Button>
    </Stack>
  );
}
