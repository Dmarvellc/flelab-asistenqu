import UserManagement from "./_components/user-management";

export default function DeveloperDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Developer Console</h2>
        <p className="text-muted-foreground">
          Manage system users and access controls.
        </p>
      </div>
      <UserManagement />
    </div>
  );
}
