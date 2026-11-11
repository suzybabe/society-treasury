import { redirect } from "next/navigation";

// Signed-in members land on their home page; the app shell sends everyone
// else to /login.
export default function Page() {
  redirect("/home");
}
