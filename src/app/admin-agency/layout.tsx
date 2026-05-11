import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminAgencyLayoutClient } from "./client-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default async function AdminAgencyLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession({ portal: "admin_agency" });

  if (!session) {
    redirect("/admin-agency/login");
  }

  return (
    <I18nProvider>
      <AdminAgencyLayoutClient>{children}</AdminAgencyLayoutClient>
    </I18nProvider>
  );
}
