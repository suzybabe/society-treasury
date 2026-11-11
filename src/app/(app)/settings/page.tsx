import type { Metadata } from "next";
import { StoreReady } from "@/state/store";
import Settings from "@/views/Settings";

export const metadata: Metadata = { title: "Settings · Society Treasury" };

export default function Page() {
  return (
    <StoreReady>
      <Settings />
    </StoreReady>
  );
}
