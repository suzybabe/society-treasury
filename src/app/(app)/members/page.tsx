import type { Metadata } from "next";
import { StoreReady } from "@/state/store";
import Members from "@/views/Members";

export const metadata: Metadata = { title: "Members · Society Treasury" };

export default function Page() {
  return (
    <StoreReady>
      <Members />
    </StoreReady>
  );
}
