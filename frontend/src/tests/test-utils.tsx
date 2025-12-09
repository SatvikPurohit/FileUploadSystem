// src/tests/test-utils.tsx
import React from "react";
import { act, render, RenderOptions, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    // setTimeout 0 ensures promises and rAFs have a tick to settle
    setTimeout(resolve, 0);
  });
}

/**
 * renderWithProviders wraps ui with MemoryRouter + QueryClientProvider.
 * Returns all testing-library render results.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  const qc = createTestQueryClient();
  const Wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={qc}>
      <React.Suspense
        fallback={<div data-testid="suspense-fallback">loading</div>}
      >
        <MemoryRouter>{children}</MemoryRouter>
      </React.Suspense>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}

export async function renderWithProvidersAsync(
  ui: React.ReactElement,
  options?: RenderOptions & { route?: string; queryClient?: QueryClient }
) {
  let result: ReturnType<typeof renderWithProviders>;
  await act(async () => {
    result = renderWithProviders(ui, options);
    // allow pending lazy imports and microtasks to resolve
    await flushPromises();
  });

  // ensure Suspense fallback has gone away
  await waitFor(() => {
    if (!result) throw new Error("render failed");
    const fallback = result.queryByTestId("suspense-fallback");
    if (fallback) throw new Error("still suspended");
    return true;
  });

  // @ts-ignore - result is assigned inside act above
  return result as ReturnType<typeof renderWithProviders>;
}

export function getFileInput(container: HTMLElement): HTMLInputElement {
  const input =
    container.querySelector('input[type="file"]') ||
    document.querySelector('input[type="file"]');
  if (!input) throw new Error("Could not find file input in DOM");
  return input as HTMLInputElement;
}
