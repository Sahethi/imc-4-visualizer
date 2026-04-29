import {
  ActionIcon,
  Button,
  Divider,
  Grid,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { ScrollableCodeHighlight } from '../../components/ScrollableCodeHighlight.tsx';
import { DerivedPriceChart, DerivedTerm } from './DerivedPriceChart.tsx';
import { IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { ReactNode, useMemo, useState } from 'react';
import { Algorithm, AlgorithmDataRow } from '../../models.ts';
import { useStore } from '../../store.ts';
import { formatNumber } from '../../utils/format.ts';
import { ConversionObservationsTable } from './ConversionObservationsTable.tsx';
import { ConversionPriceChart } from './ConversionPriceChart.tsx';
import { EnvironmentChart } from './EnvironmentChart.tsx';
import { AlgorithmSummaryCard } from './AlgorithmSummaryCard.tsx';
import { ListingsTable } from './ListingsTable.tsx';
import { OrderDepthTable } from './OrderDepthTable.tsx';
import { OrderLifecycleTable } from './OrderLifecycleTable.tsx';
import { OrdersTable } from './OrdersTable.tsx';
import { OptionsAnalysisChart } from './OptionsAnalysisChart.tsx';
import { OptionsGreeksChart } from './OptionsGreeksChart.tsx';
import { OptionsIVChart } from './OptionsIVChart.tsx';
import { PlainValueObservationChart } from './PlainValueObservationChart.tsx';
import { PlainValueObservationsTable } from './PlainValueObservationsTable.tsx';
import { PositionChart } from './PositionChart.tsx';
import { PositionTable } from './PositionTable.tsx';
import { ProductPriceChart } from './ProductPriceChart.tsx';
import { ProductPriceOverlayChart } from './ProductPriceOverlayChart.tsx';
import { ProfitLossChart } from './ProfitLossChart.tsx';
import { ProfitLossTable } from './ProfitLossTable.tsx';
import { SpreadChart } from './SpreadChart.tsx';
import { TimestampDetail } from './TimestampDetail.tsx';
import { TimestampsCard } from './TimestampsCard.tsx';
import { TradesTable } from './TradesTable.tsx';
import { TransportChart } from './TransportChart.tsx';
import { VolumeChart } from './VolumeChart.tsx';
import { VisualizerCard } from './VisualizerCard.tsx';

type DashboardViewType =
  | 'blank'
  | 'algorithmCode'
  | 'derivedPrice'
  | 'profitLoss'
  | 'position'
  | 'productPrice'
  | 'volume'
  | 'spread'
  | 'conversionPrice'
  | 'transport'
  | 'environment'
  | 'plainValueObservation'
  | 'optionsAnalysis'
  | 'optionsIV'
  | 'optionsGreeks'
  | 'timestamps'
  | 'algorithmSummary'
  | 'listingsTable'
  | 'conversionObservationsTable'
  | 'plainValueObservationsTable'
  | 'positionTable'
  | 'profitLossTable'
  | 'ordersTable'
  | 'ownTradesTable'
  | 'marketTradesTable'
  | 'orderDepthTable'
  | 'orderLifecycleTable'
  | 'timestampDetail';

interface DashboardCellConfig {
  id: string;
  kind: DashboardViewType;
  symbol?: string;
  symbols?: string[];
  timestamp?: number;
  terms?: DerivedTerm[];
}

interface DashboardRowConfig {
  id: string;
  left: DashboardCellConfig;
  right: DashboardCellConfig;
}

interface DashboardContext {
  algorithm: Algorithm;
  symbols: string[];
  vevSymbols: string[];
  conversionSymbols: string[];
  plainValueObservationSymbols: string[];
  timestamps: number[];
  latestTimestamp: number | null;
  firstSymbol: string | null;
  firstVevSymbol: string | null;
  underlyingSymbol: string;
  hasAlgorithmData: boolean;
  rowByTimestamp: Map<number, AlgorithmDataRow>;
}

const VIEW_OPTIONS: Array<{ value: DashboardViewType; label: string }> = [
  { value: 'blank', label: 'Empty' },
  { value: 'algorithmCode', label: 'Algorithm source (.py)' },
  { value: 'derivedPrice', label: 'Derived price (math operations)' },
  { value: 'profitLoss', label: 'Profit / Loss chart' },
  { value: 'position', label: 'Positions chart' },
  { value: 'productPrice', label: 'Price vs time' },
  { value: 'volume', label: 'Volume vs time' },
  { value: 'spread', label: 'Order book spread' },
  { value: 'conversionPrice', label: 'Conversion price chart' },
  { value: 'transport', label: 'Transport chart' },
  { value: 'environment', label: 'Environment chart' },
  { value: 'plainValueObservation', label: 'Plain value observation chart' },
  { value: 'optionsAnalysis', label: 'Options analysis chart' },
  { value: 'optionsIV', label: 'Options IV chart' },
  { value: 'optionsGreeks', label: 'Options Greeks chart' },
  { value: 'timestamps', label: 'Timestamp slider' },
  { value: 'algorithmSummary', label: 'Algorithm summary' },
  { value: 'listingsTable', label: 'Listings table' },
  { value: 'conversionObservationsTable', label: 'Conversion observations table' },
  { value: 'plainValueObservationsTable', label: 'Plain value observations table' },
  { value: 'positionTable', label: 'Positions table' },
  { value: 'profitLossTable', label: 'Profit / Loss table' },
  { value: 'ordersTable', label: 'Orders table' },
  { value: 'ownTradesTable', label: 'Own trades table' },
  { value: 'marketTradesTable', label: 'Market trades table' },
  { value: 'orderDepthTable', label: 'Order depth table' },
  { value: 'orderLifecycleTable', label: 'Order lifecycle table' },
  { value: 'timestampDetail', label: 'Timestamp detail' },
];

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function isVevSymbol(symbol: string): boolean {
  return /^VEV_\d+$/.test(symbol);
}

function buildContext(algorithm: Algorithm): DashboardContext {
  const symbols = new Set<string>();
  const conversionSymbols = new Set<string>();
  const plainValueObservationSymbols = new Set<string>();
  const rowByTimestamp = new Map<number, AlgorithmDataRow>();

  for (const row of algorithm.activityLogs) {
    symbols.add(row.product);
  }

  for (const row of algorithm.data) {
    rowByTimestamp.set(row.state.timestamp, row);

    for (const symbol of Object.keys(row.state.listings)) {
      symbols.add(symbol);
    }

    for (const symbol of Object.keys(row.state.observations.plainValueObservations)) {
      plainValueObservationSymbols.add(symbol);
    }

    for (const symbol of Object.keys(row.state.observations.conversionObservations)) {
      conversionSymbols.add(symbol);
      symbols.add(symbol);
    }
  }

  const sortedSymbols = uniqueSorted([...symbols]);
  const sortedTimestamps = [...new Set(algorithm.data.map(row => row.state.timestamp))].sort((a, b) => a - b);
  const vevSymbols = sortedSymbols.filter(isVevSymbol);

  return {
    algorithm,
    symbols: sortedSymbols,
    vevSymbols,
    conversionSymbols: uniqueSorted([...conversionSymbols]),
    plainValueObservationSymbols: uniqueSorted([...plainValueObservationSymbols]),
    timestamps: sortedTimestamps,
    latestTimestamp: sortedTimestamps.length > 0 ? sortedTimestamps[sortedTimestamps.length - 1] : null,
    firstSymbol: sortedSymbols[0] ?? null,
    firstVevSymbol: vevSymbols[0] ?? null,
    underlyingSymbol: 'VELVETFRUIT_EXTRACT',
    hasAlgorithmData: algorithm.data.length > 0,
    rowByTimestamp,
  };
}

function makeCell(
  kind: DashboardViewType,
  context: DashboardContext,
  overrides: Partial<DashboardCellConfig> = {},
): DashboardCellConfig {
  const base: DashboardCellConfig = { id: createId(), kind };

  switch (kind) {
    case 'profitLoss':
    case 'position':
      return {
        ...base,
        symbols: overrides.symbols?.length ? overrides.symbols : context.symbols,
      };
    case 'productPrice':
      return {
        ...base,
        symbols: overrides.symbols?.length
          ? overrides.symbols
          : overrides.symbol
            ? [overrides.symbol]
            : context.firstSymbol
              ? [context.firstSymbol]
              : [],
      };
    case 'optionsAnalysis':
    case 'optionsIV':
      return {
        ...base,
        symbols: overrides.symbols?.length ? overrides.symbols : context.vevSymbols,
      };
    case 'optionsGreeks':
    case 'spread':
    case 'environment':
      return {
        ...base,
        symbol: overrides.symbol ?? overrides.symbols?.[0] ?? context.firstSymbol ?? undefined,
      };
    case 'volume':
    case 'conversionPrice':
    case 'transport':
    case 'plainValueObservation':
      return {
        ...base,
        symbols: overrides.symbols?.length
          ? overrides.symbols
          : overrides.symbol
            ? [overrides.symbol]
            : context.firstSymbol
              ? [context.firstSymbol]
              : [],
      };
    case 'derivedPrice':
      return {
        ...base,
        terms: overrides.terms ?? (
          context.symbols.length >= 2
            ? [
                { coefficient: 1, symbol: context.symbols[0] },
                { coefficient: -1, symbol: context.symbols[1] },
              ]
            : context.symbols.length === 1
              ? [{ coefficient: 1, symbol: context.symbols[0] }]
              : []
        ),
      };
    case 'orderDepthTable':
      return {
        ...base,
        symbol: overrides.symbol ?? context.firstSymbol ?? undefined,
        timestamp: overrides.timestamp ?? context.latestTimestamp ?? undefined,
      };
    case 'ordersTable':
    case 'ownTradesTable':
    case 'marketTradesTable':
    case 'listingsTable':
    case 'conversionObservationsTable':
    case 'plainValueObservationsTable':
    case 'positionTable':
    case 'profitLossTable':
    case 'orderLifecycleTable':
    case 'timestampDetail':
      return {
        ...base,
        timestamp: overrides.timestamp ?? context.latestTimestamp ?? undefined,
      };
    default:
      return base;
  }
}

function makeRow(
  context: DashboardContext,
  leftKind: DashboardViewType,
  rightKind: DashboardViewType,
): DashboardRowConfig {
  return {
    id: createId(),
    left: makeCell(leftKind, context),
    right: makeCell(rightKind, context),
  };
}

function buildDefaultRows(context: DashboardContext): DashboardRowConfig[] {
  return [
    makeRow(context, 'profitLoss', 'position'),
    makeRow(context, 'productPrice', 'spread'),
    makeRow(context, 'optionsAnalysis', 'optionsIV'),
    makeRow(context, 'optionsGreeks', context.hasAlgorithmData ? 'timestamps' : 'algorithmSummary'),
  ];
}

function getTimestampCellOptions(context: DashboardContext): Array<{ value: string; label: string }> {
  return context.timestamps.map(timestamp => ({ value: String(timestamp), label: formatNumber(timestamp) }));
}

function getSymbolOptions(symbols: string[], currentValue?: string): Array<{ value: string; label: string }> {
  const options = symbols.map(symbol => ({ value: symbol, label: symbol }));
  if (currentValue && !symbols.includes(currentValue)) {
    options.unshift({ value: currentValue, label: currentValue });
  }
  return options;
}

function getCellTitle(kind: DashboardViewType): string {
  return VIEW_OPTIONS.find(option => option.value === kind)?.label ?? 'Cell';
}

function getTimestamp(context: DashboardContext, timestamp?: number): number | null {
  if (timestamp !== undefined && context.rowByTimestamp.has(timestamp)) {
    return timestamp;
  }

  return context.latestTimestamp;
}

function renderTimestampTables(
  timestamp: number,
  context: DashboardContext,
  viewKind: DashboardViewType,
  cell: DashboardCellConfig,
): ReactNode {
  const row = context.rowByTimestamp.get(timestamp);
  if (!row) {
    return <Text c="dimmed">No timestamp data available for {formatNumber(timestamp)}</Text>;
  }

  switch (viewKind) {
    case 'listingsTable':
      return <ListingsTable listings={row.state.listings} />;
    case 'conversionObservationsTable':
      return <ConversionObservationsTable conversionObservations={row.state.observations.conversionObservations} />;
    case 'plainValueObservationsTable':
      return <PlainValueObservationsTable plainValueObservations={row.state.observations.plainValueObservations} />;
    case 'positionTable':
      return <PositionTable position={row.state.position} />;
    case 'profitLossTable':
      return <ProfitLossTable timestamp={timestamp} />;
    case 'ordersTable':
      return <OrdersTable orders={row.orders} />;
    case 'ownTradesTable':
      return <TradesTable trades={row.state.ownTrades} />;
    case 'marketTradesTable':
      return <TradesTable trades={row.state.marketTrades} />;
    case 'timestampDetail':
      return <TimestampDetail row={row} />;
    case 'orderLifecycleTable':
      return <OrderLifecycleTable algorithm={context.algorithm} row={row} />;
    case 'orderDepthTable': {
      if (!cell.symbol) {
        return <Text c="dimmed">Select a symbol.</Text>;
      }

      const orderDepth = row.state.orderDepths[cell.symbol];
      return orderDepth ? (
        <OrderDepthTable orderDepth={orderDepth} />
      ) : (
        <Text c="dimmed">
          No order depth for {cell.symbol} at {formatNumber(timestamp)}
        </Text>
      );
    }
    default:
      return <Text c="dimmed">Unsupported timestamp view.</Text>;
  }
}

function DashboardCellEditor({
  cell,
  context,
  onChange,
}: {
  cell: DashboardCellConfig;
  context: DashboardContext;
  onChange: (next: DashboardCellConfig) => void;
}): ReactNode {
  const timestampOptions = getTimestampCellOptions(context);
  const symbolOptions = getSymbolOptions(context.symbols, cell.symbol);
  const vevSymbolOptions = getSymbolOptions(context.vevSymbols, cell.symbol);
  const conversionSymbolOptions = getSymbolOptions(context.conversionSymbols, cell.symbol);
  const plainValueSymbolOptions = getSymbolOptions(context.plainValueObservationSymbols, cell.symbol);

  const updateKind = (nextKind: DashboardViewType) => {
    onChange(makeCell(nextKind, context, cell));
  };

  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" align="flex-start" mb="xs">
        <Text fw={600}>{getCellTitle(cell.kind)}</Text>
      </Group>

      <Stack gap="sm">
        <Select
          label="Visualization"
          data={VIEW_OPTIONS}
          value={cell.kind}
          onChange={value => value && updateKind(value as DashboardViewType)}
          searchable
        />

        {(cell.kind === 'profitLoss' ||
          cell.kind === 'position' ||
          cell.kind === 'productPrice' ||
          cell.kind === 'volume' ||
          cell.kind === 'conversionPrice' ||
          cell.kind === 'transport' ||
          cell.kind === 'plainValueObservation' ||
          cell.kind === 'optionsAnalysis' ||
          cell.kind === 'optionsIV') && (
          <MultiSelect
            label={cell.kind === 'optionsAnalysis' || cell.kind === 'optionsIV' ? 'Vouchers' : 'Symbols'}
            data={
              cell.kind === 'optionsAnalysis' || cell.kind === 'optionsIV'
                ? vevSymbolOptions
                : cell.kind === 'conversionPrice' || cell.kind === 'transport'
                  ? conversionSymbolOptions
                  : cell.kind === 'plainValueObservation'
                    ? plainValueSymbolOptions.length > 0
                      ? plainValueSymbolOptions
                      : symbolOptions
                    : symbolOptions
            }
            value={cell.symbols ?? (cell.symbol ? [cell.symbol] : [])}
            onChange={value => onChange({ ...cell, symbols: value.filter(Boolean), symbol: value[0] ?? undefined })}
            searchable
          />
        )}

        {(cell.kind === 'spread' || cell.kind === 'environment') && (
          <Select
            label="Symbol"
            data={cell.kind === 'environment' ? conversionSymbolOptions : symbolOptions}
            value={cell.symbol ?? context.firstSymbol ?? ''}
            onChange={value => onChange({ ...cell, symbol: value ?? undefined })}
            searchable
          />
        )}

        {cell.kind === 'optionsGreeks' && (
          <Select
            label="Voucher"
            data={vevSymbolOptions}
            value={cell.symbol ?? context.firstVevSymbol ?? ''}
            onChange={value => onChange({ ...cell, symbol: value ?? undefined })}
            searchable
          />
        )}

        {cell.kind === 'derivedPrice' && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>Terms</Text>
            {(cell.terms ?? []).map((term, i) => (
              <Group key={i} gap="xs" wrap="nowrap" align="flex-end">
                <NumberInput
                  label={i === 0 ? 'Coeff' : undefined}
                  value={term.coefficient}
                  onChange={v => {
                    const next = [...(cell.terms ?? [])];
                    next[i] = { ...next[i], coefficient: typeof v === 'number' ? v : 0 };
                    onChange({ ...cell, terms: next });
                  }}
                  w={80}
                  size="xs"
                  decimalScale={4}
                  allowDecimal
                  allowNegative
                  step={0.1}
                />
                <Text size="sm" mb={4}>×</Text>
                <Select
                  label={i === 0 ? 'Symbol' : undefined}
                  data={symbolOptions}
                  value={term.symbol}
                  onChange={v => {
                    const next = [...(cell.terms ?? [])];
                    next[i] = { ...next[i], symbol: v ?? '' };
                    onChange({ ...cell, terms: next });
                  }}
                  size="xs"
                  style={{ flex: 1 }}
                  searchable
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  mb={4}
                  onClick={() => onChange({ ...cell, terms: (cell.terms ?? []).filter((_, j) => j !== i) })}
                  aria-label="Remove term"
                >
                  <IconTrash size={12} />
                </ActionIcon>
              </Group>
            ))}
            <Button
              size="xs"
              variant="outline"
              leftSection={<IconPlus size={12} />}
              onClick={() =>
                onChange({
                  ...cell,
                  terms: [...(cell.terms ?? []), { coefficient: 1, symbol: context.firstSymbol ?? '' }],
                })
              }
            >
              Add term
            </Button>
          </Stack>
        )}

        {cell.kind === 'orderDepthTable' && (
          <>
            <Select
              label="Symbol"
              data={symbolOptions}
              value={cell.symbol ?? context.firstSymbol ?? ''}
              onChange={value => onChange({ ...cell, symbol: value ?? undefined })}
              searchable
            />
            <Select
              label="Timestamp"
              data={timestampOptions}
              value={
                cell.timestamp !== undefined
                  ? String(cell.timestamp)
                  : context.latestTimestamp !== null
                    ? String(context.latestTimestamp)
                    : ''
              }
              onChange={value => onChange({ ...cell, timestamp: value === null ? undefined : Number(value) })}
              searchable
            />
          </>
        )}

        {(cell.kind === 'ordersTable' ||
          cell.kind === 'ownTradesTable' ||
          cell.kind === 'marketTradesTable' ||
          cell.kind === 'listingsTable' ||
          cell.kind === 'conversionObservationsTable' ||
          cell.kind === 'plainValueObservationsTable' ||
          cell.kind === 'positionTable' ||
          cell.kind === 'profitLossTable' ||
          cell.kind === 'orderLifecycleTable' ||
          cell.kind === 'timestampDetail') && (
          <Select
            label="Timestamp"
            data={timestampOptions}
            value={
              cell.timestamp !== undefined
                ? String(cell.timestamp)
                : context.latestTimestamp !== null
                  ? String(context.latestTimestamp)
                  : ''
            }
            onChange={value => onChange({ ...cell, timestamp: value === null ? undefined : Number(value) })}
            searchable
          />
        )}
      </Stack>
    </Paper>
  );
}

function DashboardCellRenderer({ cell, context }: { cell: DashboardCellConfig; context: DashboardContext }): ReactNode {
  const algorithmCode = useStore(state => state.algorithmCode);

  switch (cell.kind) {
    case 'blank':
      return (
        <VisualizerCard>
          <Text c="dimmed">Choose a visualization for this cell.</Text>
        </VisualizerCard>
      );
    case 'algorithmCode':
      return algorithmCode ? (
        <VisualizerCard title="Algorithm source (.py)">
          <ScrollableCodeHighlight code={algorithmCode} language="python" />
        </VisualizerCard>
      ) : (
        <VisualizerCard title="Algorithm source (.py)">
          <Text c="dimmed">No Python file loaded. Drop a .py file on the home page to load it.</Text>
        </VisualizerCard>
      );
    case 'derivedPrice':
      return <DerivedPriceChart terms={cell.terms ?? []} />;
    case 'profitLoss':
      return <ProfitLossChart symbols={cell.symbols?.length ? cell.symbols : context.symbols} />;
    case 'position':
      return <PositionChart symbols={cell.symbols?.length ? cell.symbols : context.symbols} />;
    case 'productPrice':
      return (cell.symbols?.length ?? 0) > 1 ? (
        <ProductPriceOverlayChart symbols={cell.symbols!} />
      ) : cell.symbols?.length === 1 || cell.symbol ? (
        <ProductPriceChart symbol={cell.symbols?.[0] ?? cell.symbol!} />
      ) : (
        <VisualizerCard>
          <Text c="dimmed">Select a symbol.</Text>
        </VisualizerCard>
      );
    case 'volume':
      return (cell.symbols?.length ?? 0) > 1 ? (
        <VolumeChart symbols={cell.symbols!} />
      ) : cell.symbols?.length === 1 || cell.symbol ? (
        <VolumeChart symbol={cell.symbols?.[0] ?? cell.symbol!} />
      ) : (
        <VisualizerCard>
          <Text c="dimmed">Select a symbol.</Text>
        </VisualizerCard>
      );
    case 'spread':
      return cell.symbol ? (
        <SpreadChart symbol={cell.symbol} />
      ) : (
        <VisualizerCard>
          <Text c="dimmed">Select a symbol.</Text>
        </VisualizerCard>
      );
    case 'conversionPrice':
      return (cell.symbols?.length ?? 0) > 1 ? (
        <ConversionPriceChart symbols={cell.symbols!} />
      ) : cell.symbols?.length === 1 || cell.symbol ? (
        <ConversionPriceChart symbol={cell.symbols?.[0] ?? cell.symbol!} />
      ) : (
        <VisualizerCard>
          <Text c="dimmed">Select a symbol.</Text>
        </VisualizerCard>
      );
    case 'transport':
      return (cell.symbols?.length ?? 0) > 1 ? (
        <TransportChart symbols={cell.symbols!} />
      ) : cell.symbols?.length === 1 || cell.symbol ? (
        <TransportChart symbol={cell.symbols?.[0] ?? cell.symbol!} />
      ) : (
        <VisualizerCard>
          <Text c="dimmed">Select a symbol.</Text>
        </VisualizerCard>
      );
    case 'environment':
      return cell.symbol ? (
        <EnvironmentChart symbol={cell.symbol} />
      ) : (
        <VisualizerCard>
          <Text c="dimmed">Select a symbol.</Text>
        </VisualizerCard>
      );
    case 'plainValueObservation':
      return (cell.symbols?.length ?? 0) > 1 ? (
        <PlainValueObservationChart symbols={cell.symbols!} />
      ) : cell.symbols?.length === 1 || cell.symbol ? (
        <PlainValueObservationChart symbol={cell.symbols?.[0] ?? cell.symbol!} />
      ) : (
        <VisualizerCard>
          <Text c="dimmed">Select a symbol.</Text>
        </VisualizerCard>
      );
    case 'optionsAnalysis':
      return (
        <OptionsAnalysisChart
          vevSymbols={context.vevSymbols}
          underlyingSymbol={context.underlyingSymbol}
          defaultSymbols={cell.symbols?.length ? cell.symbols.filter(Boolean) : context.vevSymbols}
        />
      );
    case 'optionsIV':
      return (
        <OptionsIVChart
          vevSymbols={context.vevSymbols}
          underlyingSymbol={context.underlyingSymbol}
          selectedSymbols={cell.symbols?.length ? cell.symbols.filter(Boolean) : context.vevSymbols}
        />
      );
    case 'optionsGreeks':
      return (
        <OptionsGreeksChart
          vevSymbols={context.vevSymbols}
          underlyingSymbol={context.underlyingSymbol}
          defaultSymbol={cell.symbol ?? context.firstVevSymbol ?? undefined}
        />
      );
    case 'timestamps':
      return context.hasAlgorithmData ? (
        <TimestampsCard />
      ) : (
        <VisualizerCard title="Timestamps">
          <Text c="dimmed">Timestamp drill-down is unavailable because this log does not include lambda data.</Text>
        </VisualizerCard>
      );
    case 'algorithmSummary':
      return context.algorithm.summary ? (
        <AlgorithmSummaryCard />
      ) : (
        <VisualizerCard title="Algorithm summary">
          <Text c="dimmed">No submission summary is available for this file.</Text>
        </VisualizerCard>
      );
    case 'listingsTable':
    case 'conversionObservationsTable':
    case 'plainValueObservationsTable':
    case 'positionTable':
    case 'profitLossTable':
    case 'ordersTable':
    case 'ownTradesTable':
    case 'marketTradesTable':
    case 'orderDepthTable':
    case 'orderLifecycleTable':
    case 'timestampDetail': {
      const timestamp = getTimestamp(context, cell.timestamp);
      if (timestamp === null) {
        return (
          <VisualizerCard title={getCellTitle(cell.kind)}>
            <Text c="dimmed">This view needs timestamped log data.</Text>
          </VisualizerCard>
        );
      }

      const content = renderTimestampTables(timestamp, context, cell.kind, cell);
      if (cell.kind === 'timestampDetail') {
        return content;
      }

      return <VisualizerCard title={getCellTitle(cell.kind)}>{content}</VisualizerCard>;
    }
    default:
      return (
        <VisualizerCard>
          <Text c="dimmed">Unsupported visualization.</Text>
        </VisualizerCard>
      );
  }
}

function DashboardRowEditor({
  row,
  index,
  context,
  onChange,
  onRemove,
}: {
  row: DashboardRowConfig;
  index: number;
  context: DashboardContext;
  onChange: (next: DashboardRowConfig) => void;
  onRemove: () => void;
}): ReactNode {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" align="center" mb="md">
        <Title order={5}>Row {index + 1}</Title>
        <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label={`Remove row ${index + 1}`}>
          <IconTrash size={16} />
        </ActionIcon>
      </Group>

      <Grid columns={12}>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <DashboardCellEditor cell={row.left} context={context} onChange={next => onChange({ ...row, left: next })} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <DashboardCellEditor
            cell={row.right}
            context={context}
            onChange={next => onChange({ ...row, right: next })}
          />
        </Grid.Col>
      </Grid>
    </Paper>
  );
}

export function DashboardBuilder(): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const context = useMemo(() => buildContext(algorithm), [algorithm]);
  const [rows, setRows] = useState<DashboardRowConfig[]>(() => buildDefaultRows(context));

  const updateRow = (index: number, next: DashboardRowConfig) => {
    setRows(current => current.map((row, rowIndex) => (rowIndex === index ? next : row)));
  };

  const addRow = () => {
    setRows(current => [...current, makeRow(context, 'blank', 'blank')]);
  };

  const resetLayout = () => {
    setRows(buildDefaultRows(context));
  };

  return (
    <Stack gap="lg">
      <VisualizerCard title="Dashboard configuration">
        <Stack gap="md">
          <Text>
            Build a custom two-column dashboard by choosing what each cell renders. Add rows to compare any mix of
            products, option views, and timestamp-based tables.
          </Text>

          <Group justify="space-between">
            <Group>
              <Button leftSection={<IconPlus size={16} />} onClick={addRow}>
                Add row
              </Button>
              <Button variant="outline" leftSection={<IconRefresh size={16} />} onClick={resetLayout}>
                Reset layout
              </Button>
            </Group>
            <Text c="dimmed">{rows.length} rows configured</Text>
          </Group>

          <Divider />

          <Stack gap="md">
            {rows.map((row, index) => (
              <DashboardRowEditor
                key={row.id}
                row={row}
                index={index}
                context={context}
                onChange={next => updateRow(index, next)}
                onRemove={() => setRows(current => current.filter((_, rowIndex) => rowIndex !== index))}
              />
            ))}
          </Stack>
        </Stack>
      </VisualizerCard>

      <Stack gap="lg">
        {rows.map((row, index) => (
          <Grid key={row.id} columns={12}>
            <Grid.Col span={12}>
              <Title order={4}>Dashboard row {index + 1}</Title>
            </Grid.Col>
            <Grid.Col span={{ xs: 12, sm: 6 }}>{<DashboardCellRenderer cell={row.left} context={context} />}</Grid.Col>
            <Grid.Col span={{ xs: 12, sm: 6 }}>{<DashboardCellRenderer cell={row.right} context={context} />}</Grid.Col>
          </Grid>
        ))}
      </Stack>
    </Stack>
  );
}
