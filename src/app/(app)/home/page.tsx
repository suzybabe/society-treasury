import type { Metadata } from "next";
import { StoreReady } from "@/state/store";
import Home from "@/views/Home";

export const metadata: Metadata = { title: "Home · Society Treasury" };

export default function Page() {
  return (
    <StoreReady>
      <Home />
    </StoreReady>
  );
}
