import { Group, Text } from '@mantine/core';
import { Dropzone, FileRejection } from '@mantine/dropzone';
import { IconUpload } from '@tabler/icons-react';
import { ReactNode, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert.tsx';
import { useAsync } from '../../hooks/use-async.ts';
import { useStore } from '../../store.ts';
import { parseAlgorithmLogs } from '../../utils/algorithm.tsx';
import { algorithmFromTrades, CsvParseError, parseCsvTrades } from '../../utils/csv.ts';
import { HomeCard } from './HomeCard.tsx';

function DropzoneContent(): ReactNode {
  return (
    <Group justify="center" gap="xl" style={{ minHeight: 80, pointerEvents: 'none' }}>
      <IconUpload size={40}></IconUpload>
      <Text size="xl" inline={true}>
        Drag file(s) here or click to select
      </Text>
    </Group>
  );
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.addEventListener('error', () => reject(new Error('FileReader emitted an error event')));
    reader.readAsText(file);
  });
}

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function LoadFromFile(): ReactNode {
  const navigate = useNavigate();

  const [error, setError] = useState<Error>();

  const setAlgorithm = useStore(state => state.setAlgorithm);
  const setAlgorithmCode = useStore(state => state.setAlgorithmCode);

  const onDrop = useAsync(
    (files: File[]) =>
      new Promise<void>(async (resolve, reject) => {
        setError(undefined);

        let hasAlgorithm = false;
        let hasPython = false;

        try {
          for (const file of files) {
            const content = await readFileText(file);
            const ext = getExtension(file.name);

            if (ext === 'py') {
              setAlgorithmCode(content);
              hasPython = true;
            } else if (ext === 'csv') {
              const trades = parseCsvTrades(content);
              setAlgorithm(algorithmFromTrades(trades));
              hasAlgorithm = true;
            } else {
              setAlgorithm(parseAlgorithmLogs(content));
              hasAlgorithm = true;
            }
          }

          if (hasAlgorithm || hasPython) {
            if (!hasAlgorithm && useStore.getState().algorithm === null) {
              setAlgorithm({ activityLogs: [], data: [] });
            }
            navigate('/visualizer');
          }

          resolve();
        } catch (err: any) {
          if (err instanceof CsvParseError) {
            reject(new Error(`CSV parse error: ${err.message}`));
          } else {
            reject(err);
          }
        }
      }),
  );

  const onReject = useCallback((rejections: FileRejection[]) => {
    const messages: string[] = [];

    for (const rejection of rejections) {
      const code = rejection.errors[0]?.code ?? 'unknown';
      const errorType =
        {
          'file-invalid-type': 'Invalid type.',
          'file-too-large': 'File too large.',
          'file-too-small': 'File too small.',
          'too-many-files': 'Too many files.',
        }[code] ?? `Rejected (${code}: ${rejection.errors[0]?.message ?? 'no message'})`;

      messages.push(`Could not load ${rejection.file.name}: ${errorType}`);
    }

    setError(new Error(messages.join('<br/>')));
  }, []);

  return (
    <HomeCard title="Load from file">
      <Text>
        Supports log files from the Prosperity servers, trade CSV files (semicolon-delimited with columns{' '}
        <code>timestamp;buyer;seller;symbol;currency;price;quantity</code>), and Python algorithm files (.py). You can
        drop multiple files at once (e.g. a CSV and a .py together).
      </Text>

      {error && <ErrorAlert error={error} />}
      {onDrop.error && <ErrorAlert error={onDrop.error} />}

      <Dropzone onDrop={onDrop.call} onReject={onReject} multiple={true} loading={onDrop.loading}>
        <Dropzone.Idle>
          <DropzoneContent />
        </Dropzone.Idle>
        <Dropzone.Accept>
          <DropzoneContent />
        </Dropzone.Accept>
      </Dropzone>
    </HomeCard>
  );
}
