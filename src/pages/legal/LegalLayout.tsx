import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

const footerLinks = [
  { label: "← Back to Diet By RD", href: "/" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Refund Policy", href: "/refund" },
  { label: "Cancellation Policy", href: "/cancellation" },
];

const LegalLayout = ({ title, lastUpdated, children }: LegalLayoutProps) => {
  const location = useLocation();
  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="legal-shell">
      <style>{`
        .legal-shell {
          --navy: #0A1628;
          --teal: #0B6E4F;
          --teal-l: #E8F5F0;
          --teal-m: #0F8A63;
          --gold: #C9952A;
          --gold-l: #FBF4E6;
          --cream: #FDFAF5;
          --white: #FFFFFF;
          --text: #1A1A2E;
          --text2: #4A5568;
          --text3: #718096;
          --border: #E2E8F0;
          min-height: 100vh;
          background: var(--cream);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
        }
        .legal-shell * { box-sizing: border-box; }

        .legal-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          height: 68px;
          padding: 0 5%;
          background: rgba(10,22,40,.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .legal-nav-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between; height: 100%;
        }
        .legal-logo {
          font-family: 'Playfair Display', serif;
          font-size: 22px; font-weight: 700; color: #fff;
          text-decoration: none; letter-spacing: -0.3px;
        }
        .legal-logo span { color: var(--gold); }
        .legal-nav-links {
          display: flex; align-items: center; gap: 32px;
          overflow-x: auto; white-space: nowrap;
          scrollbar-width: none;
        }
        .legal-nav-links::-webkit-scrollbar { display: none; }
        .legal-nav-links a {
          color: rgba(255,255,255,.75); text-decoration: none;
          font-size: 14px; font-weight: 500; transition: color 0.2s;
        }
        .legal-nav-links a:hover { color: #fff; }

        .legal-container {
          max-width: 768px;
          margin: 0 auto;
          padding: 120px 24px 80px;
          width: 100%;
          background: var(--cream);
        }
        .legal-title {
          font-family: 'Playfair Display', serif;
          font-size: 40px;
          font-weight: 700;
          color: var(--navy);
          margin-bottom: 8px;
        }
        .last-updated {
          font-size: 14px;
          color: var(--text3);
          margin-bottom: 48px;
        }

        .legal-page h2 {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--navy);
          margin-top: 40px;
          margin-bottom: 12px;
        }
        .legal-page h3 {
          font-family: 'DM Sans', sans-serif;
          font-size: 17px;
          font-weight: 600;
          color: var(--text);
          margin-top: 20px;
          margin-bottom: 8px;
        }
        .legal-page p {
          font-size: 16px;
          line-height: 1.75;
          color: var(--text);
          margin-bottom: 12px;
        }
        .legal-page ul {
          list-style: none;
          padding-left: 0;
          margin: 12px 0;
        }
        .legal-page ul li {
          position: relative;
          padding-left: 20px;
          margin-bottom: 8px;
          line-height: 1.75;
        }
        .legal-page ul li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 11px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--teal);
        }
        .legal-page strong { font-weight: 600; color: var(--text); }
        .legal-page a { color: var(--teal); text-decoration: none; }
        .legal-page a:hover { text-decoration: underline; }

        .legal-footer {
          border-top: 1px solid var(--border);
          padding-top: 48px;
          margin-top: 64px;
        }
        .legal-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          font-size: 14px;
          color: var(--teal);
        }
        .legal-footer-links a { color: var(--teal); text-decoration: none; }
        .legal-footer-links a:hover { text-decoration: underline; }
        .legal-footer-links .is-active { font-weight: 700; }
        .legal-footer-copy {
          margin-top: 16px;
          font-size: 13px;
          color: var(--text3);
        }

        @media (max-width: 600px) {
          .legal-title { font-size: 32px; }
          .legal-container { padding: 120px 20px 80px; }
          .legal-nav-links { gap: 16px; }
        }
      `}</style>

      <nav className="legal-nav">
        <div className="legal-nav-inner">
          <Link to="/" className="legal-logo">
            Diet By <span>RD</span>
          </Link>
          <div className="legal-nav-links">
            <Link to="/">Home</Link>
            <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>
            <a href="/terms" target="_blank" rel="noopener">Terms</a>
            <a href="/refund" target="_blank" rel="noopener">Refund</a>
            <a href="/cancellation" target="_blank" rel="noopener">Cancellation</a>
          </div>
        </div>
      </nav>

      <main className="legal-container">
        <h1 className="legal-title">{title}</h1>
        <p className="last-updated">Last updated: {lastUpdated}</p>
        {children}
        <footer className="legal-footer">
          <div className="legal-footer-links">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={isActive(link.href) ? "is-active" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="legal-footer-copy">
            © 2026 Diet By RD Private Limited. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LegalLayout;
