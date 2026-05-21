import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { OfficeNetwork } from "@/lib/types";

export const useBSSIDCheck = () => {
  const [networks, setNetworks] = useState<OfficeNetwork[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isMounted = true;

    const fetchNetworks = async () => {
      const { data } = await supabase.from("office_networks").select("*");
      if (isMounted && data) {
        setNetworks(data as OfficeNetwork[]);
      }
    };

    fetchNetworks();
    const interval = setInterval(fetchNetworks, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { networks };
};
