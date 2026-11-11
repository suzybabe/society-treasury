import type { Metadata } from "next";
import { StoreReady } from "@/state/store";
import Committee from "@/views/Committee";

export const metadata: Metadata = { title: "Committee · Society Treasury" };

export default function Page() {
  return (
    <StoreReady>
      <Committee />
    </StoreReady>
  );
}
