import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WelcomeFlow from "@/components/welcome/WelcomeFlow";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  // Seen once is seen for good; the flow is reachable again only by clearing
  // onboarded_at, which is a deliberate act.
  if (profile?.onboarded_at) redirect("/");

  return (
    <WelcomeFlow
      name={profile?.full_name ?? profile?.username ?? "trader"}
    />
  );
}
