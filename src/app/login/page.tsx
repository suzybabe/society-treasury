import type { Metadata } from "next";
import { SessionReady } from "@/state/session";
import Login from "@/views/Login";

export const metadata: Metadata = { title: "Sign in · Society Treasury" };

export default function Page() {
  return (
    <SessionReady>
      <Login />
    </SessionReady>
  );
}
