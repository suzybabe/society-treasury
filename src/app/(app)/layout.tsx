import { AppShell } from "@/components/AppShell";

// Header, footer and sign-in guard for every member page.
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
