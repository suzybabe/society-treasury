import type { Metadata } from "next";
import { StoreReady } from "@/state/store";
import Login from "@/views/Login";

export const metadata: Metadata = { title: "Sign in · Society Treasury" };

export default function Page() {
  return (
    <StoreReady>
      <Login />
    </StoreReady>
  );
}
