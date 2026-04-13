"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  Briefcase,
  FileText,
  BarChart3,
  Settings,
  GraduationCap,
  ClipboardCheck,
  Sparkles,
  LayoutDashboard,
  Bell,
  FolderKanban,
  LogOut,
  Inbox,
  BookOpen,
  Upload,
  Megaphone,
  Menu,
} from "lucide-react";
import { cn } from "@client/lib/utils";
import { useRole, type UserRole } from "@client/components/providers/role-provider";
import { Avatar, AvatarFallback } from "@client/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@client/components/ui/sheet";

// ============================================
// NAVIGATION DEFINITIONS PER ROLE
// ============================================

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  items: NavItem[];
}

const candidateNavigationSections: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Profile Settings", href: "/dashboard/settings", icon: Settings },
      { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
      { name: "Documents Upload", href: "/dashboard/upload", icon: Upload },
    ],
  },
  {
    items: [
      { name: "Job Openings", href: "/dashboard/jobs", icon: Briefcase },
      { name: "Internships", href: "/dashboard/internships", icon: BookOpen },
      { name: "My Applications", href: "/dashboard/applications", icon: FolderKanban },
    ],
  },
  {
    items: [
      { name: "Assessments", href: "/dashboard/assessments", icon: ClipboardCheck },
      { name: "AI Skill Validation", href: "/dashboard/ai-interview", icon: Sparkles },
      { name: "Improvement Tracks", href: "/dashboard/improvement", icon: GraduationCap },
    ],
  },
];

const hrNavigationSections: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Profile Settings", href: "/dashboard/settings", icon: Settings },
      { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    items: [
      { name: "Job Openings", href: "/dashboard/jobs", icon: Briefcase },
      { name: "Job Applications", href: "/dashboard/received-applications", icon: Inbox },
      { name: "Candidates Evaluation", href: "/dashboard/candidates", icon: Users },
    ],
  },
  {
    items: [
      { name: "Internships", href: "/dashboard/internships", icon: BookOpen },
      { name: "Internship Applications", href: "/dashboard/internship-applications", icon: ClipboardCheck },
    ],
  },
  {
    items: [
      { name: "CV Upload & Processing", href: "/dashboard/upload", icon: FileText },
      { name: "Candidates Outreach", href: "/dashboard/candidates-outreach", icon: Megaphone },
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
];

// ============================================
// SIDEBAR COMPONENT
// ============================================

function SidebarContent({ role, roleLabel, pathname, clearRole, onNavigate, userName, userEmail }: {
  role: UserRole;
  roleLabel: string;
  pathname: string;
  clearRole: () => void;
  onNavigate?: () => void;
  userName: string | null;
  userEmail: string | null;
}) {
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <>
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          TI
        </div>
        <div>
          <h1 className="text-sm font-semibold">Talent Intelligence</h1>
          <p className="text-xs text-muted-foreground">Platform</p>
        </div>
      </div>

      {/* User + Role badge */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{userName ?? userEmail ?? "—"}</p>
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            role === "hr"
              ? "bg-primary/10 text-primary"
              : "bg-emerald-500/10 text-emerald-600"
          )}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {(role === "hr" ? hrNavigationSections : candidateNavigationSections).map(
          (section, sIdx) => (
            <div key={sIdx}>
              {sIdx > 0 && (
                <div className="my-2 mx-3 border-t border-border" />
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          )
        )}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-2">
        <button
          onClick={clearRole}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
        <p className="text-xs text-muted-foreground px-3">
          Talent Intelligence v0.1
        </p>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, clearRole, isLoading, userName, userEmail } = useRole();

  // Redirect to login if not authenticated (after hydration)
  useEffect(() => {
    if (!isLoading && !role) {
      router.push("/auth/login");
    }
  }, [isLoading, role, router]);

  if (!role) {
    return null;
  }

  const roleLabel = role === "hr" ? "HR Manager" : "Candidate";

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-card">
      <SidebarContent
        role={role}
        roleLabel={roleLabel}
        pathname={pathname}
        clearRole={clearRole}
        userName={userName}
        userEmail={userEmail}
      />
    </aside>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, clearRole, isLoading, userName, userEmail } = useRole();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !role) {
      router.push("/auth/login");
    }
  }, [isLoading, role, router]);

  if (!role) {
    return null;
  }

  const roleLabel = role === "hr" ? "HR Manager" : "Candidate";

  return (
    <div className="md:hidden flex items-center h-14 border-b bg-card px-4 gap-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-2 rounded-lg hover:bg-accent transition-colors">
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarContent
              role={role}
              roleLabel={roleLabel}
              pathname={pathname}
              clearRole={clearRole}
              onNavigate={() => setOpen(false)}
              userName={userName}
              userEmail={userEmail}
            />
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
          TI
        </div>
        <span className="text-sm font-semibold">Talent Intelligence</span>
      </div>
    </div>
  );
}
