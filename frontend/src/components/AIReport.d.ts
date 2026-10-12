import * as React from 'react';

export interface AIReportProps {
  response: unknown;
  title?: string;
  model?: string;
  tokens?: number | Record<string, number>;
  loading?: boolean;
  error?: string;
}

export default function AIReport(props: AIReportProps): React.ReactElement | null;
