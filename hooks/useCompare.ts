"use client";

import { useEffect, useState } from "react";
import { getProductComparisonBySlug } from "@/services/compare.service";
import { CompareResult } from "@/types/compare";

interface UseCompareResult {
  data: CompareResult | null;
  loading: boolean;
  notFound: boolean;
}

export function useCompare(slug: string): UseCompareResult {
  const [data, setData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setNotFound(false);

      const result = await getProductComparisonBySlug(slug);

      if (!active) return;

      if (!result) {
        setData(null);
        setNotFound(true);
      } else {
        setData(result);
      }

      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  return { data, loading, notFound };
}
