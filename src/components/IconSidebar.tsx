import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Inbox,
  Users as UsersIcon, 
  Building2, 
  TrendingUp, 
  FileText,
  Settings,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

const navigationIcons = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Contatos", href: "/contacts", icon: UsersIcon },
  { name: "Organizações", href: "/organizations", icon: Building2 },
  { name: "Negócios", href: "/deals", icon: TrendingUp },
  { name: "Formulários", href: "/forms", icon: FileText },
];

export function IconSidebar() {
  const location = useLocation();
  const { isAdmin } = useUserRole();

  return (
    <aside className="w-20 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6">
      {/* Logo */}
      <div className="mb-8 flex items-center justify-center w-12 h-12 rounded-2xl bg-primary">
        <span className="text-2xl font-bold text-primary-foreground">C</span>
      </div>

      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col gap-4">
        {navigationIcons.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              title={item.name}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
        
        {isAdmin && (
          <Link
            to="/users"
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
              location.pathname === "/users"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            title="Usuários"
          >
            <UserCog className="h-5 w-5" />
          </Link>
        )}
      </nav>

      {/* Settings at bottom */}
      <button className="flex items-center justify-center w-12 h-12 rounded-2xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200">
        <Settings className="h-5 w-5" />
      </button>
    </aside>
  );
}
