import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon, ChevronLeft, ChevronRight, ChevronUp, LifeBuoy, Mail, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;
    return (
      <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
        {/* Collapse toggle (Desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent transition-colors z-10 shadow-sm"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        )}

        {/* Brand header */}
        <div className={`px-5 py-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} border-b border-sidebar-border`}>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-md">
            {title.slice(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div>
              <div className="font-bold text-sm text-sidebar-primary-foreground tracking-tight">{title}</div>
              <div className="text-[11px] text-white mt-0.5">{subtitle}</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-6 space-y-8 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white px-3 mb-3">
                  {section.title}
                </div>
              )}
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const isActive = item.href.includes('?') 
                    ? location.pathname + location.search === item.href
                    : location.pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                        isCollapsed && "justify-center px-0",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-white hover:bg-sidebar-accent hover:text-white"
                      )}
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      {!isCollapsed && <span className="flex-1">{item.label}</span>}
                      {!isCollapsed && item.badge !== undefined && (
                        <span className={cn(
                          "text-[11px] px-2 py-0.5 rounded-full font-semibold",
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-sidebar-accent text-white"
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
        <div className={`px-3 py-4 border-t border-sidebar-border ${isCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          <div className="space-y-1 w-full">
            {!isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150">
                    <div className="flex items-center gap-3">
                      <LifeBuoy className="w-[18px] h-[18px] shrink-0" />
                      <span>Contact Support</span>
                    </div>
                    <ChevronUp className="w-4 h-4 text-sidebar-foreground/50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56 mb-2 border-sidebar-accent/20 bg-sidebar shadow-lg rounded-xl">
                  <div className="flex flex-col gap-1 p-1">
                    <a 
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${location.pathname.startsWith('/doctor') ? 'doctor@dietbyrd.com' : 'hello@dietbyrd.com'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-2 py-2.5 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary-foreground rounded-lg transition-colors"
                    >
                      <Mail className="w-[16px] h-[16px] text-sidebar-foreground/70" />
                      <span>{location.pathname.startsWith('/doctor') ? 'doctor@dietbyrd.com' : 'hello@dietbyrd.com'}</span>
                    </a>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button title="Contact Support" className="w-full flex items-center justify-center p-2 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150">
                <LifeBuoy className="w-[18px] h-[18px] shrink-0" />
              </button>
            )}
            {bottomContent}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Toggle & Sidebar */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="rounded-full shadow-xl bg-primary text-primary-foreground w-14 h-14 hover:bg-primary/90">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r-0">
            {renderContent(true)}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col sticky top-0 self-start h-screen shrink-0 relative border-r border-sidebar-border transition-all duration-300",
        collapsed ? 'w-16' : 'w-64'
      )}>
        {renderContent(false)}
      </aside>
    </>
  );
};

export default AppSidebar;
