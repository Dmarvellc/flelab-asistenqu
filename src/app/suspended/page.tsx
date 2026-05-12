import { AlertTriangle } from "lucide-react";
import { SuspendedLogoutButton } from "./logout-button";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuspendedPage() {
  const session = await getSession();

  // If there's no session (revoked because status changed to active) or they are no longer suspended
  if (!session) {
    redirect("/");
  } else if (session.status !== "SUSPENDED") {
    redirect(`/${session.portal || ""}`);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16 font-[family-name:var(--font-poppins)]">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Akun Anda Ditangguhkan</h1>
          <p className="text-gray-500">
            Akses ke dashboard telah dinonaktifkan.
          </p>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Karena alasan keamanan atau pelanggaran kebijakan, akun Anda saat ini sedang dalam masa penangguhan dan tidak dapat digunakan untuk mengakses layanan apa pun di AsistenQu.
        </p>
        
        <div className="w-full pt-4 space-y-6">
          <SuspendedLogoutButton />
          
          <div className="text-sm text-gray-500">
            Hubungi <a href="mailto:support@asistenqu.com?subject=Banding Penangguhan Akun" className="font-medium text-black hover:underline">support@asistenqu.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}
