import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AgentDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dasbor Agen</h2>
        <p className="text-muted-foreground">
          Selamat datang di portal agen Anda. Kelola klien dan polis asuransi dengan mudah.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Klien Aktif</CardTitle>
            <CardDescription>Total klien aktif yang dikelola</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Polis Pending</CardTitle>
            <CardDescription>Polis menunggu persetujuan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Komisi</CardTitle>
            <CardDescription>Pendapatan bulan ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Rp 0</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
