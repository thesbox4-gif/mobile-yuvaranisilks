import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

// Stale-only refetch when screen regains focus. Avoids blocking tab switches with
// full network round-trips when data is still fresh (staleTime window).
export function useRefetchOnFocus(...queryKeyPrefixes) {
  const qc = useQueryClient();
  const isFirst = useRef(true);
  const keysRef = useRef(queryKeyPrefixes);
  keysRef.current = queryKeyPrefixes;

  useFocusEffect(
    useCallback(() => {
      if (isFirst.current) {
        isFirst.current = false;
        return;
      }
      for (const key of keysRef.current) {
        qc.refetchQueries({ queryKey: key, stale: true });
      }
    }, [qc])
  );
}
