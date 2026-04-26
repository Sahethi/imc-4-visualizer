import Highcharts from 'highcharts';
import { Group, NumberInput, Text } from '@mantine/core';
import { ReactNode, useRef, useState } from 'react';
import { Order, ProsperitySymbol, Trade } from '../../models.ts';
import { useStore } from '../../store.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { Chart } from './Chart.tsx';

export interface ProductPriceChartProps {
  symbol: ProsperitySymbol;
}

export function ProductPriceChart({ symbol }: ProductPriceChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const showBBRef = useRef(false);
  const [emaPeriod, setEmaPeriod] = useState(20);
  const [smaPeriod, setSmaPeriod] = useState(50);
  const [emaInput, setEmaInput] = useState(20);
  const [smaInput, setSmaInput] = useState(50);

  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: 'line',
      name: 'Bid 3',
      color: getBidColor(0.5),
      marker: { enabled: false },
      data: [],
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Bid 2',
      color: getBidColor(0.75),
      marker: { enabled: false },
      data: [],
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Bid 1',
      color: getBidColor(1.0),
      marker: { enabled: false },
      data: [],
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Mid price',
      color: 'gray',
      dashStyle: 'Dash',
      marker: { enabled: false },
      data: [],
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Ask 1',
      color: getAskColor(1.0),
      marker: { enabled: false },
      data: [],
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Ask 2',
      color: getAskColor(0.75),
      marker: { enabled: false },
      data: [],
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Ask 3',
      color: getAskColor(0.5),
      marker: { enabled: false },
      data: [],
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Buy order submitted',
      color: getBidColor(1.0),
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      connectNulls: false,
    },
    {
      type: 'line',
      name: 'Sell order submitted',
      color: getAskColor(1.0),
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      connectNulls: false,
    },
    {
      type: 'scatter',
      name: 'Bought',
      color: '#1f8f4b',
      marker: { symbol: 'triangle', radius: 6, lineColor: '#000000', lineWidth: 1 },
      data: [],
      lineWidth: 0,
      yAxis: 0,
      dataGrouping: { enabled: false },
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          return `<span style="color:${this.color}">●</span> Bought (<b>${(this as any).custom}</b>): <b>${this.y}</b><br/>`;
        },
      },
    },
    {
      type: 'scatter',
      name: 'Sold',
      color: '#b03a2e',
      marker: { symbol: 'triangle-down', radius: 6, lineColor: '#000000', lineWidth: 1 },
      data: [],
      lineWidth: 0,
      yAxis: 0,
      dataGrouping: { enabled: false },
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          return `<span style="color:${this.color}">●</span> Sold (<b>${(this as any).custom}</b>): <b>${this.y}</b><br/>`;
        },
      },
    },
    {
      type: 'line',
      name: 'EMA',
      color: '#f59e0b',
      dashStyle: 'ShortDash',
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'SMA',
      color: '#8b5cf6',
      dashStyle: 'ShortDot',
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'VWAP',
      color: '#06b6d4',
      dashStyle: 'Dash',
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'Wall Mid',
      color: '#f97316',
      dashStyle: 'ShortDot',
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
    },
    {
      type: 'line',
      name: 'RSI(14)',
      color: 'transparent',
      marker: { enabled: false },
      data: [],
      lineWidth: 0,
      yAxis: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          const v = (this as any).custom;
          if (v == null) return '';
          return `<span style="color:#94a3b8">●</span> RSI(14): <b>${v.toFixed(1)}</b><br/>`;
        },
      },
    },
    {
      type: 'line',
      name: 'BB Upper',
      color: '#64748b',
      dashStyle: 'ShortDash',
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
      visible: showBBRef.current,
      showInLegend: false,
    },
    {
      type: 'line',
      name: 'Bollinger Bands',
      color: '#64748b',
      dashStyle: 'Dot',
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
      visible: showBBRef.current,
      events: {
        legendItemClick() {
          showBBRef.current = !showBBRef.current;
          const chart = (this as any).chart;
          const newVisible = showBBRef.current;
          chart.series
            .filter((s: any) => ['BB Upper', 'Bollinger Bands', 'BB Lower'].includes(s.name))
            .forEach((s: any) => s.setVisible(newVisible, false));
          chart.redraw();
          return false;
        },
      },
    },
    {
      type: 'line',
      name: 'BB Lower',
      color: '#64748b',
      dashStyle: 'ShortDash',
      marker: { enabled: false },
      data: [],
      lineWidth: 1,
      yAxis: 0,
      dataGrouping: { enabled: false },
      visible: showBBRef.current,
      showInLegend: false,
    },
    {
      type: 'line',
      name: 'Z-Score(20)',
      color: 'transparent',
      marker: { enabled: false },
      data: [],
      lineWidth: 0,
      yAxis: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          const v = (this as any).custom;
          if (v == null) return '';
          return `<span style="color:#f472b6">●</span> Z-Score(20): <b>${v.toFixed(2)}</b><br/>`;
        },
      },
    },
    {
      type: 'line',
      name: 'MACD',
      color: 'transparent',
      marker: { enabled: false },
      data: [],
      lineWidth: 0,
      yAxis: 0,
      dataGrouping: { enabled: false },
      showInLegend: false,
      tooltip: {
        pointFormatter(this: Highcharts.Point) {
          const p = (this as any).custom;
          if (p == null) return '';
          return (
            `<span style="color:#3b82f6">●</span> MACD: <b>${p.macd.toFixed(4)}</b>` +
            `&nbsp;&nbsp;Signal: <b>${p.signal.toFixed(4)}</b>` +
            `&nbsp;&nbsp;Hist: <b>${p.hist.toFixed(4)}</b><br/>`
          );
        },
      },
    },
  ];

  function getOrderSide(order: Order): 'Buy' | 'Sell' {
    return order.quantity > 0 ? 'Buy' : 'Sell';
  }

  function getFillSide(trade: Trade): 'Buy' | 'Sell' | null {
    if (trade.buyer === 'SUBMISSION') {
      return 'Buy';
    }

    if (trade.seller === 'SUBMISSION') {
      return 'Sell';
    }

    return null;
  }

  for (const row of algorithm.activityLogs) {
    if (row.product !== symbol) {
      continue;
    }

    const hasOrderBookLevels = row.bidPrices.length > 0 || row.askPrices.length > 0;
    if (!hasOrderBookLevels && row.midPrice === 0) {
      continue;
    }

    for (let i = 0; i < row.bidPrices.length; i++) {
      (series[2 - i] as any).data.push([row.timestamp, row.bidPrices[i]]);
    }

    (series[3] as any).data.push([row.timestamp, row.midPrice]);

    for (let i = 0; i < row.askPrices.length; i++) {
      (series[i + 4] as any).data.push([row.timestamp, row.askPrices[i]]);
    }
  }

  // Compute EMA(20), SMA(50), VWAP, RSI(14) from mid prices
  const symbolLogs = algorithm.activityLogs.filter(r => r.product === symbol);

  {
    const emaK = 2 / (emaPeriod + 1);
    let ema: number | null = null;
    let cumPV = 0;
    let cumVol = 0;
    const window: number[] = [];

    for (const row of symbolLogs) {
      const price = row.midPrice;
      const vol = row.bidVolumes.reduce((a, b) => a + b, 0) + row.askVolumes.reduce((a, b) => a + b, 0);
      const t = row.timestamp;

      // EMA
      ema = ema === null ? price : price * emaK + ema * (1 - emaK);
      (series[11] as any).data.push([t, ema]);

      // SMA
      window.push(price);
      if (window.length > smaPeriod) window.shift();
      if (window.length === smaPeriod) {
        (series[12] as any).data.push([t, window.reduce((a, b) => a + b, 0) / smaPeriod]);
      }

      // VWAP
      cumPV += price * Math.max(vol, 1);
      cumVol += Math.max(vol, 1);
      (series[13] as any).data.push([t, cumPV / cumVol]);

      // Wall Mid (volume-weighted micro-price)
      const bid1 = row.bidPrices[0];
      const ask1 = row.askPrices[0];
      const bidVol1 = row.bidVolumes[0] ?? 0;
      const askVol1 = row.askVolumes[0] ?? 0;
      if (bid1 != null && ask1 != null && bidVol1 + askVol1 > 0) {
        const wallMid = (ask1 * bidVol1 + bid1 * askVol1) / (bidVol1 + askVol1);
        (series[14] as any).data.push([t, wallMid]);
      }
    }
  }

  {
    const period = 14;
    const prices = symbolLogs.map(r => r.midPrice);
    const timestamps = symbolLogs.map(r => r.timestamp);
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = Math.max(change, 0);
      const loss = Math.max(-change, 0);

      if (i <= period) {
        avgGain += gain / period;
        avgLoss += loss / period;
        if (i === period) {
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          (series[15] as any).data.push({ x: timestamps[i], y: prices[i], custom: 100 - 100 / (1 + rs) });
        }
      } else {
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        (series[15] as any).data.push({ x: timestamps[i], y: prices[i], custom: 100 - 100 / (1 + rs) });
      }
    }
  }

  // Bollinger Bands (20, 2)
  {
    const bbPeriod = 20;
    const bbWindow: number[] = [];

    for (const row of symbolLogs) {
      const price = row.midPrice;
      bbWindow.push(price);
      if (bbWindow.length > bbPeriod) bbWindow.shift();
      if (bbWindow.length === bbPeriod) {
        const mean = bbWindow.reduce((a, b) => a + b, 0) / bbPeriod;
        const std = Math.sqrt(bbWindow.reduce((a, b) => a + (b - mean) ** 2, 0) / bbPeriod);
        (series[16] as any).data.push([row.timestamp, mean + 2 * std]);
        (series[17] as any).data.push([row.timestamp, mean]);
        (series[18] as any).data.push([row.timestamp, mean - 2 * std]);
        (series[19] as any).data.push({ x: row.timestamp, y: price, custom: std > 0 ? (price - mean) / std : 0 });
      }
    }
  }

  // MACD (12, 26, 9)
  {
    const k12 = 2 / (12 + 1);
    const k26 = 2 / (26 + 1);
    const k9 = 2 / (9 + 1);
    let ema12: number | null = null;
    let ema26: number | null = null;
    let signal: number | null = null;

    for (const row of symbolLogs) {
      const price = row.midPrice;
      ema12 = ema12 === null ? price : price * k12 + ema12 * (1 - k12);
      ema26 = ema26 === null ? price : price * k26 + ema26 * (1 - k26);
      const macd = ema12 - ema26;
      signal = signal === null ? macd : macd * k9 + signal * (1 - k9);
      (series[20] as any).data.push({ x: row.timestamp, y: price, custom: { macd, signal, hist: macd - signal } });
    }
  }

  const bidAskByTimestamp = new Map<number, { bestBid: number | null; bestAsk: number | null }>();
  for (const row of algorithm.activityLogs) {
    if (row.product !== symbol) continue;
    bidAskByTimestamp.set(row.timestamp, {
      bestBid: row.bidPrices[0] ?? null,
      bestAsk: row.askPrices[0] ?? null,
    });
  }

  function isTaker(side: 'Buy' | 'Sell', price: number, timestamp: number): boolean {
    const book = bidAskByTimestamp.get(timestamp);
    if (!book) return true;
    if (side === 'Buy') return book.bestAsk !== null && price >= book.bestAsk;
    return book.bestBid !== null && price <= book.bestBid;
  }

  const seenOwnTrades = new Set<string>();

  for (const row of algorithm.data) {
    const timestamp = row.state.timestamp;

    const buyOrderPrices: number[] = [];
    const sellOrderPrices: number[] = [];

    for (const order of row.orders[symbol] ?? []) {
      const side = getOrderSide(order);
      if (side === 'Buy') {
        buyOrderPrices.push(order.price);
      } else {
        sellOrderPrices.push(order.price);
      }
    }

    buyOrderPrices.sort((a, b) => a - b);
    sellOrderPrices.sort((a, b) => a - b);

    for (const price of buyOrderPrices) {
      (series[7] as any).data.push([timestamp, price]);
    }

    if (buyOrderPrices.length > 0) {
      (series[7] as any).data.push([timestamp, null]);
    }

    for (const price of sellOrderPrices) {
      (series[8] as any).data.push([timestamp, price]);
    }

    if (sellOrderPrices.length > 0) {
      (series[8] as any).data.push([timestamp, null]);
    }

    for (const trade of row.state.ownTrades[symbol] ?? []) {
      const side = getFillSide(trade);
      if (side === null) {
        continue;
      }

      const tradeKey = `${trade.symbol}:${trade.price}:${trade.quantity}:${trade.buyer}:${trade.seller}:${trade.timestamp}`;
      if (seenOwnTrades.has(tradeKey)) {
        continue;
      }

      seenOwnTrades.add(tradeKey);

      const role = isTaker(side, trade.price, trade.timestamp) ? 'taker' : 'maker';
      const point = { x: trade.timestamp, y: trade.price, custom: role };
      if (side === 'Buy') {
        (series[9] as any).data.push(point);
      } else {
        (series[10] as any).data.push(point);
      }
    }
  }

  const controls = (
    <Group gap="md" wrap="nowrap">
      <Group gap={4} wrap="nowrap">
        <Text size="sm">EMA period</Text>
        <NumberInput
          value={emaInput}
          onChange={v => typeof v === 'number' && v >= 1 && setEmaInput(v)}
          onBlur={() => emaInput >= 1 && setEmaPeriod(emaInput)}
          onKeyDown={e => e.key === 'Enter' && emaInput >= 1 && setEmaPeriod(emaInput)}
          min={1}
          max={500}
          size="xs"
          w={64}
        />
      </Group>
      <Group gap={4} wrap="nowrap">
        <Text size="sm">SMA period</Text>
        <NumberInput
          value={smaInput}
          onChange={v => typeof v === 'number' && v >= 1 && setSmaInput(v)}
          onBlur={() => smaInput >= 1 && setSmaPeriod(smaInput)}
          onKeyDown={e => e.key === 'Enter' && smaInput >= 1 && setSmaPeriod(smaInput)}
          min={1}
          max={500}
          size="xs"
          w={64}
        />
      </Group>
    </Group>
  );

  return (
    <Chart
      title={`${symbol} - Price`}
      options={{ yAxis: { title: { text: 'Price' } } }}
      series={series}
      controls={controls}
    />
  );
}
