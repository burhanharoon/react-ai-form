import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { AIFieldStatus } from "./use-ai-form";

/**
 * Lookup function returning the AI status of a field by its dot-notation path.
 */
export type GetFieldStatus = (path: string) => AIFieldStatus;

const AIFormStatusContext = createContext<GetFieldStatus | null>(null);

export interface AIFormStatusProviderProps {
  /** The `getFieldStatus` function from {@link useAIForm}. */
  getFieldStatus: GetFieldStatus;
  children: ReactNode;
}

/**
 * Wraps part of a form so any descendant {@link AIFormField} or
 * {@link AITextField} can derive its `aiStatus` automatically. Optional —
 * components fall back to `'empty' | 'user-modified'` based on RHF's dirty
 * state when no provider is present.
 *
 * @example
 * ```tsx
 * const ai = useAIForm(form, { schema });
 * <AIFormStatusProvider getFieldStatus={ai.getFieldStatus}>
 *   <AITextField form={form} name="company" />
 * </AIFormStatusProvider>
 * ```
 */
export function AIFormStatusProvider({ getFieldStatus, children }: AIFormStatusProviderProps) {
  const value = useMemo(() => getFieldStatus, [getFieldStatus]);
  return <AIFormStatusContext.Provider value={value}>{children}</AIFormStatusContext.Provider>;
}

/**
 * Returns the {@link GetFieldStatus} from the nearest
 * {@link AIFormStatusProvider}, or `null` if none is present.
 */
export function useAIFormStatusLookup(): GetFieldStatus | null {
  return useContext(AIFormStatusContext);
}
