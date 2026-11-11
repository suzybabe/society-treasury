import type { Metadata } from "next";
import { StoreReady } from "@/state/store";
import ChainLog from "@/views/ChainLog";

export const metadata: Metadata = { title: "On NEAR · Society Treasury" };

export default function Page() {
  return (
    <StoreReady>
      <ChainLog />
    </StoreReady>
  );
}
