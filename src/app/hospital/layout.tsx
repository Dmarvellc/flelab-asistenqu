import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HospitalLayoutClient } from "./client-layout";
import { headers } from "next/headers";

const AUTH_PATHS = ["/login", "/register"];

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isPublic = AUTH_PATHS.some((p) => pathname.endsWith(p));

  if (isPublic) {
    return <>{children}</>;
  }

  const session = await getSession({ portal: "hospital" });

  if (!session) {
    redirect("/hospital/login");
  }

  if (session.status === "SUSPENDED") {
    redirect("/suspended");
  }

  return <HospitalLayoutClient>{children}</HospitalLayoutClient>;
}
