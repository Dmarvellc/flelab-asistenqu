import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DeveloperLayoutClient } from "./client-layout";
import { headers } from "next/headers";

const AUTH_PATHS = ["/login", "/register"];

export default async function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isPublic = AUTH_PATHS.some((p) => pathname.endsWith(p));

  // Skip session check for public routes, but always return DeveloperLayoutClient
  // to avoid Next.js segment layout cache bugs.
  if (!isPublic) {
    const session = await getSession({ portal: "developer" });

    if (!session) {
      redirect("/developer/login");
    }

    if (session.status === "SUSPENDED") {
      redirect("/suspended");
    }
  }

  return <DeveloperLayoutClient>{children}</DeveloperLayoutClient>;


}
