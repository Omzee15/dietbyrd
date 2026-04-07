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
    <aside className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 relative border-r border-sidebar-border`}>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent transition-colors z-10 shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Brand header */}
      <div className={`px-5 py-6 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} border-b border-sidebar-border`}>
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-md">
          {title.slice(0, 2).toUpperCase()}
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm text-sidebar-primary-foreground tracking-tight">{title}</div>
            <div className="text-[11px] text-sidebar-foreground/50 mt-0.5">{subtitle}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-6 space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 px-3 mb-3">
                {section.title}
              </div>
            )}
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground"
                    )}
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && item.badge !== undefined && (
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full font-semibold",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-sidebar-accent text-sidebar-foreground/60"
                      )}>
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

      {/* Bottom content */}
      {bottomContent && (
        <div className={`px-3 py-4 border-t border-sidebar-border ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {bottomContent}
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
