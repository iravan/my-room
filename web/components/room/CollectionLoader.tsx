"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useCollection } from "@/lib/collection";

// Loads the record collection once and surfaces a broken-save warning.
export function CollectionLoader() {
  useEffect(() => {
    const warning = useCollection.getState().load();
    if (warning) toast.warning(warning, { duration: 12000 });
  }, []);
  return null;
}
