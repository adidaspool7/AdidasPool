import { Sidebar, MobileSidebar } from "@client/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileSidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
