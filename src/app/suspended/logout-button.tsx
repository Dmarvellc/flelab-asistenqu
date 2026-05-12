"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SuspendedLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full font-medium h-11 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-black"
      onClick={handleLogout}
      disabled={loading}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {loading ? "Keluar..." : "Keluar dari Akun"}
    </Button>
  );
}
