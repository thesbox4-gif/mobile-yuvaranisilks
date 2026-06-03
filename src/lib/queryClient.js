import { QueryClient } from '@tanstack/react-query';
import { getProduct } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export function prefetchProduct(productId) {
  if (!productId) return;
  return queryClient.prefetchQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    staleTime: 60_000,
  });
}
