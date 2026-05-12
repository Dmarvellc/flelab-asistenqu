import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, Mail, LogOut } from "lucide-react";
import { SuspendedLogoutButton } from "./logout-button";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16 font-[family-name:var(--font-poppins)]">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Card className="border-red-100 shadow-lg animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-600">Akun Anda Ditangguhkan</CardTitle>
            <CardDescription className="text-gray-500 mt-2">
              Akses ke dashboard telah dinonaktifkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 text-center">
            <p className="text-sm text-gray-600 leading-relaxed">
              Karena alasan keamanan atau pelanggaran kebijakan, akun Anda saat ini sedang dalam masa penangguhan dan tidak dapat digunakan untuk mengakses layanan apa pun di AsistenQu.
            </p>
            
            <div className="flex flex-col gap-3 pt-2">
              <Button asChild className="w-full bg-black hover:bg-gray-800 text-white font-medium h-11" variant="default">
                <a href="mailto:support@asistenqu.com?subject=Banding Penangguhan Akun">
                  <Mail className="mr-2 h-4 w-4" />
                  Hubungi support@asistenqu.com
                </a>
              </Button>
              
              <SuspendedLogoutButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
