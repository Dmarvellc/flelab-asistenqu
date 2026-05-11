import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DeveloperLayoutClient } from "./client-layout";

export default async function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession({ portal: "developer" });

  if (!session) {
    redirect("/developer/login");
  }

  return <DeveloperLayoutClient>{children}</DeveloperLayoutClient>;
}
