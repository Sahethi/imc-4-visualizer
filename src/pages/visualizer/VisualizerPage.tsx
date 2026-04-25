import { Alert, Container } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store.ts';
import { DashboardBuilder } from './DashboardBuilder.tsx';

export function VisualizerPage(): ReactNode {
  const algorithm = useStore(state => state.algorithm);
  const hasAlgorithmData = (algorithm?.data.length ?? 0) > 0;

  const { search } = useLocation();

  if (algorithm === null) {
    return <Navigate to={`/${search}`} />;
  }

  return (
    <Container fluid>
      {!hasAlgorithmData && (
        <Alert icon={<IconInfoCircle size={16} />} title="Limited mode" color="yellow" variant="light" mb="md">
          This file does not include lambda logs. Activity-based charts are available, while timestamp drill-down and
          order-level state are disabled.
        </Alert>
      )}
      <DashboardBuilder />
    </Container>
  );
}
