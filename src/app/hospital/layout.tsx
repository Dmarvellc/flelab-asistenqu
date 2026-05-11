import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HospitalLayoutClient } from "./client-layout";

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession({ portal: "hospital" });

  if (!session) {
    redirect("/hospital/login");
  }

  return <HospitalLayoutClient>{children}</HospitalLayoutClient>;
}
