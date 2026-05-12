import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminAgencyLayoutClient } from "./client-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { headers } from "next/headers";

const AUTH_PATHS = ["/login", "/register"];

export default async function AdminAgencyLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isPublic = AUTH_PATHS.some((p) => pathname.endsWith(p));

  if (!isPublic) {
    const session = await getSession({ portal: "admin_agency" });

    if (!session) {
      redirect("/admin-agency/login");
    }

    if (session.status === "SUSPENDED") {
      redirect("/suspended");
    }
  }

  return (
    <I18nProvider>
      <AdminAgencyLayoutClient>{children}</AdminAgencyLayoutClient>
    </I18nProvider>
  );
}
