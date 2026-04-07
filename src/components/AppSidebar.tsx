import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface SidebarSection {
  title: string;
  items: NavItem[];
}

interface AppSidebarProps {
  title: string;
  subtitle: string;
  sections: SidebarSection[];
  bottomContent?: React.ReactNode;
}

const AppSidebar = ({ title, subtitle, sections, bottomContent }: AppSidebarProps) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} min-h-screen flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 relative`}>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-sidebar border border-border flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <div className={`p-5 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
          {title.slice(0, 2).toUpperCase()}
        </div>
        {!collapsed && (
          <div>
            <div className="font-semibold text-sm text-sidebar-primary-foreground">{title}</div>
            <div className="text-xs text-sidebar-foreground/60">{subtitle}</div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-6 mt-2">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-2">
                {section.title}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && item.badge !== undefined && (
                      <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {bottomContent && (
        <div className={`p-3 border-t border-sidebar-accent ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {bottomContent}
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
