import type { Metadata } from "next";
import { Suspense } from "react";
import { StoreReady } from "@/state/store";
import RequestDetail from "@/views/RequestDetail";

export const metadata: Metadata = { title: "Request · Society Treasury" };

// Cache Components needs at least one param to prerender the route's shell.
// Every other request ID is served at request time.
export async function generateStaticParams() {
  return [{ id: "REQ-0048" }];
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StoreReady>
        <RequestDetail />
      </StoreReady>
    </Suspense>
  );
}
