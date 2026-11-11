import { requireMember } from "@/server/auth";
import { ok, route } from "@/server/http";
import { buildState } from "@/server/society";

// Everything an active member's screens need in one response.
export const GET = route(async (req: Request) => {
  const me = await requireMember(req);
  return ok(await buildState(me));
});
