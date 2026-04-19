import { Table, Text } from '@mantine/core';
import { ReactNode, useMemo } from 'react';
import { Algorithm, AlgorithmDataRow, Order, ProsperitySymbol, Trade } from '../../models.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { formatNumber } from '../../utils/format.ts';
import { SimpleTable } from './SimpleTable.tsx';

interface TrackedOrder {
  symbol: ProsperitySymbol;
  side: 'Buy' | 'Sell';
  price: number;
  quantity: number;
  submittedTimestamp: number;
  filledQuantity: number;
  firstFillTimestamp: number | null;
  lastFillTimestamp: number | null;
}

export interface OrderLifecycleTableProps {
  algorithm: Algorithm;
  row: AlgorithmDataRow;
}

function getOrderSide(order: Order): 'Buy' | 'Sell' {
  return order.quantity > 0 ? 'Buy' : 'Sell';
}

function getTradeSide(trade: Trade): 'Buy' | 'Sell' | null {
  if (trade.buyer === 'SUBMISSION') {
    return 'Buy';
  }

  if (trade.seller === 'SUBMISSION') {
    return 'Sell';
  }

  return null;
}

export function OrderLifecycleTable({ algorithm, row }: OrderLifecycleTableProps): ReactNode {
  const submittedTimestamp = row.state.timestamp;

  const lifecycles = useMemo(() => {
    const selectedIndex = algorithm.data.findIndex(dataRow => dataRow.state.timestamp === submittedTimestamp);
    if (selectedIndex === -1) {
      return [];
    }

    const openOrders = new Map<string, TrackedOrder[]>();
    const lifecycles: TrackedOrder[] = [];

    const enqueueOrder = (order: Order) => {
      const trackedOrder: TrackedOrder = {
        symbol: order.symbol,
        side: getOrderSide(order),
        price: order.price,
        quantity: Math.abs(order.quantity),
        submittedTimestamp,
        filledQuantity: 0,
        firstFillTimestamp: null,
        lastFillTimestamp: null,
      };

      const queueKey = `${trackedOrder.symbol}:${trackedOrder.side}`;
      const queue = openOrders.get(queueKey) ?? [];
      queue.push(trackedOrder);
      openOrders.set(queueKey, queue);
      lifecycles.push(trackedOrder);
    };

    const applyTrade = (trade: Trade, timestamp: number) => {
      const side = getTradeSide(trade);
      if (side === null) {
        return;
      }

      const queueKey = `${trade.symbol}:${side}`;
      const queue = openOrders.get(queueKey);
      if (queue === undefined || queue.length === 0) {
        return;
      }

      let remainingQuantity = trade.quantity;
      while (remainingQuantity > 0 && queue.length > 0) {
        const currentOrder = queue[0];
        const openQuantity = currentOrder.quantity - currentOrder.filledQuantity;
        const filledQuantity = Math.min(openQuantity, remainingQuantity);

        currentOrder.filledQuantity += filledQuantity;
        currentOrder.firstFillTimestamp ??= timestamp;
        currentOrder.lastFillTimestamp = timestamp;
        remainingQuantity -= filledQuantity;

        if (currentOrder.filledQuantity >= currentOrder.quantity) {
          queue.shift();
        }
      }
    };

    const selectedRow = algorithm.data[selectedIndex];
    for (const orders of Object.values(selectedRow.orders)) {
      for (const order of orders) {
        enqueueOrder(order);
      }
    }

    for (let i = selectedIndex; i < algorithm.data.length; i++) {
      const dataRow = algorithm.data[i];
      const timestamp = dataRow.state.timestamp;

      for (const trades of Object.values(dataRow.state.ownTrades)) {
        for (const trade of trades) {
          applyTrade(trade, timestamp);
        }
      }
    }

    return lifecycles;
  }, [algorithm.data, submittedTimestamp]);

  if (lifecycles.length === 0) {
    return <Text>Timestamp has no submitted orders to track</Text>;
  }

  const rows: ReactNode[] = lifecycles.map((order, index) => {
    const color = order.side === 'Buy' ? getBidColor(0.1) : getAskColor(0.1);
    const status =
      order.filledQuantity === 0 ? 'Open' : order.filledQuantity < order.quantity ? 'Partially filled' : 'Filled';

    return (
      <Table.Tr
        key={`${order.symbol}-${order.side}-${order.submittedTimestamp}-${index}`}
        style={{ backgroundColor: color }}
      >
        <Table.Td>{order.symbol}</Table.Td>
        <Table.Td>{order.side}</Table.Td>
        <Table.Td>{formatNumber(order.price)}</Table.Td>
        <Table.Td>{formatNumber(order.quantity)}</Table.Td>
        <Table.Td>{formatNumber(order.submittedTimestamp)}</Table.Td>
        <Table.Td>{order.firstFillTimestamp === null ? '—' : formatNumber(order.firstFillTimestamp)}</Table.Td>
        <Table.Td>{order.lastFillTimestamp === null ? '—' : formatNumber(order.lastFillTimestamp)}</Table.Td>
        <Table.Td>{formatNumber(order.filledQuantity)}</Table.Td>
        <Table.Td>{status}</Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <SimpleTable
        label="submitted orders"
        columns={['Symbol', 'Side', 'Price', 'Qty', 'Submitted', 'First fill', 'Last fill', 'Filled qty', 'Status']}
        rows={rows}
      />
      <Text size="sm" c="dimmed" mt={8}>
        Fills are matched FIFO by symbol and side because the log format does not include order IDs.
      </Text>
    </>
  );
}
