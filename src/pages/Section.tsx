import React from 'react';
import { ErrorBoundary } from '@/lib/ErrorBoundary';

/**
 * One section of a page. If it throws while rendering it shows nothing and
 * the rest of the page carries on: the approved design has no error states,
 * and a missing section is closer to it than an invented message. Adds no
 * markup of its own.
 */
export const Section: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <ErrorBoundary name={name} fallback={null}>
    {children}
  </ErrorBoundary>
);
