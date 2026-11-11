import type { Metadata } from "next";
import { StoreReady } from "@/state/store";
import SpendingLog from "@/views/SpendingLog";

export const metadata: Metadata = { title: "Spending · Society Treasury" };

export default function Page() {
  return (
    <StoreReady>
      <SpendingLog />
    </StoreReady>
  );
}
