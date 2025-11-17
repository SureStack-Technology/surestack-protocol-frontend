import { useEffect, useState } from "react";
import poc from "../analytics/pocAnalytics.json";

export function usePocAnalytics() {
  const [data] = useState(poc);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  return { data, loading, error: null };
}

