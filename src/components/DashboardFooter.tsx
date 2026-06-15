import React from "react";
import { Link } from "react-router-dom";

export function DashboardFooter() {
  return (
    <footer className="mt-auto border-t py-6 px-6 bg-background">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© 2026 Diet By RD Private Limited. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link to="/privacy" target="_blank" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms" target="_blank" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="/contact" target="_blank" className="hover:text-primary transition-colors">Contact Support</Link>
        </div>
      </div>
    </footer>
  );
}
