import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";

export function useBusinessRole() {
  const { account, provider } = useWeb3();
  const [role, setRole] = useState("user");

  useEffect(() => {
    if (!account || !provider) {
      setRole("user");
      return;
    }

    // TODO: Replace with actual role logic later
    setRole("business");
  }, [account, provider]);

  return { role, isBusiness: role === "business" };
}

