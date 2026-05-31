import { Children, ReactElement, ReactNode, cloneElement, isValidElement } from "react";
import { Link, useLocation } from "react-router-dom";

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
  introCallout?: ReactNode;
};

const footerLinks = [
  { label: "← Back to Diet By RD", href: "/" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Refund Policy", href: "/refund" },
  { label: "Cancellation Policy", href: "/cancellation" },
];

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Refund", href: "/refund" },
  { label: "Cancellation", href: "/cancellation" },
];

const renderLegalNode = (node: ReactNode): ReactNode => {
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<{ children?: ReactNode; className?: string }>;
  const children = element.props.children;

  if (element.type === "h2" && typeof children === "string") {
    const match = children.match(/^(\d+\.)\s*(.+)$/);
    if (match) {
      return cloneElement(element, {
        children: (
          <span className="legal-section-heading">
            <span className="legal-section-number">{match[1]}</span>
            <span className="legal-section-title">{match[2]}</span>
          </span>
        ),
      });
    }
  }

  if (children) {
    return cloneElement(element, {
      children: Children.map(children, renderLegalNode),
    });
  }

  return element;
};

const LegalLayout = ({ title, lastUpdated, children, introCallout }: LegalLayoutProps) => {
  const location = useLocation();
  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="legal-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap');

        .legal-shell {
          --navy: #0A1628;
          --teal: #0B6E4F;
          --teal-m: #138A64;
          --gold: #C9952A;
          --cream: #FDFAF5;
          --text: #1A1A2E;
          --text2: #2B2F3A;
          --text3: #6B6F76;
          min-height: 100vh;
          background: var(--cream);
          color: var(--text);
          font-family: 'Playfair Display', serif;
        }
        .legal-shell * { box-sizing: border-box; }

        .legal-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          height: 68px;
          padding: 0 24px;
          background: rgba(10,22,40,.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .legal-nav-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between; height: 100%;
          gap: 24px;
        }
        .legal-logo {
          font-family: 'Playfair Display', serif;
          font-size: 22px; font-weight: 700; color: #fff;
          text-decoration: none; letter-spacing: -0.3px; white-space: nowrap;
        }
        .legal-logo span { color: var(--gold); }
        .legal-nav-links {
          display: flex; align-items: center; gap: 24px;
          overflow-x: auto; white-space: nowrap;
          scrollbar-width: none;
        }
        .legal-nav-links::-webkit-scrollbar { display: none; }
        .legal-nav-links a {
          color: rgba(255,255,255,.68); text-decoration: none;
          font-size: 14px; font-weight: 400; transition: color 0.2s;
        }
        .legal-nav-links a:hover,
        .legal-nav-links a.is-active { color: #fff; }

        .legal-container {
          max-width: 768px;
          margin: 0 auto;
          padding: 120px 24px 80px;
          width: 100%;
          background: transparent;
        }
        .legal-meta-line {
          text-align: right;
          font-style: italic;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text3);
          margin-bottom: 18px;
        }
        .legal-title-card {
          background: rgba(11,110,79,0.06);
          border: 1px solid rgba(11,110,79,0.18);
          border-radius: 4px;
          padding: 48px 40px;
          margin-bottom: 56px;
          text-align: center;
        }
        .legal-brand-title {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--navy);
          line-height: 1.1;
        }
        .legal-document-title {
          font-size: 26px;
          font-weight: 400;
          font-style: italic;
          color: var(--teal);
          margin-top: 8px;
          line-height: 1.2;
        }
        .legal-effective {
          font-size: 13px;
          font-style: italic;
          color: var(--text3);
          margin-top: 16px;
          line-height: 1.6;
        }
        .legal-intro-callout {
          background: rgba(11,110,79,0.08);
          border: 1px solid var(--teal);
          border-radius: 6px;
          padding: 24px 28px;
          margin-bottom: 56px;
          font-size: 16px;
          line-height: 1.75;
          color: var(--text);
          font-family: 'Playfair Display', serif;
        }
        .legal-intro-callout strong { font-weight: 700; color: var(--navy); }

        .legal-page h2 {
          margin-top: 48px;
          margin-bottom: 20px;
        }
        .legal-page h2:first-child { margin-top: 0; }
        .legal-section-heading {
          display: flex;
          align-items: baseline;
          gap: 16px;
        }
        .legal-section-number {
          font-size: 32px;
          font-weight: 700;
          color: var(--gold);
          line-height: 1.2;
          font-family: 'Playfair Display', serif;
        }
        .legal-section-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--navy);
          line-height: 1.25;
          font-family: 'Playfair Display', serif;
        }
        .legal-page h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--navy);
          margin-top: 28px;
          margin-bottom: 10px;
          line-height: 1.4;
        }
        .legal-page p {
          font-size: 16px;
          line-height: 1.8;
          color: var(--text);
          margin: 0 0 14px;
          font-family: 'Playfair Display', serif;
        }
        .legal-page ul {
          list-style: none;
          padding-left: 0;
          margin: 12px 0 20px;
        }
        .legal-page ul li {
          position: relative;
          padding-left: 22px;
          margin-bottom: 8px;
          line-height: 1.75;
          color: var(--text);
          font-size: 16px;
        }
        .legal-page ul li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 12px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold);
        }
        .legal-page strong {
          color: var(--navy);
          font-weight: 700;
        }
        .legal-page a,
        .legal-footer-links a {
          color: var(--teal);
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 3px;
          transition: color 0.2s;
        }
        .legal-page a:hover,
        .legal-footer-links a:hover { color: var(--teal-m); }

        .legal-footer {
          border-top: 1px solid rgba(11,110,79,0.15);
          padding-top: 40px;
          margin-top: 72px;
        }
        .legal-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          font-size: 14px;
        }
        .legal-footer-links .is-active {
          color: var(--navy);
          font-weight: 700;
        }
        .legal-footer-copy {
          margin-top: 18px;
          font-size: 13px;
          color: var(--text3);
        }

        @media (max-width: 700px) {
          .legal-container { padding: 112px 20px 72px; }
          .legal-title-card { padding: 40px 24px; margin-bottom: 44px; }
          .legal-brand-title { font-size: 30px; }
          .legal-document-title { font-size: 22px; }
          .legal-section-heading { gap: 12px; }
          .legal-section-number { font-size: 26px; }
          .legal-section-title { font-size: 20px; }
          .legal-nav-links { gap: 16px; }
          .legal-intro-callout { padding: 20px; margin-bottom: 48px; }
        }
      `}</style>

      <nav className="legal-nav">
        <div className="legal-nav-inner">
          <Link to="/" className="legal-logo">
            Diet By <span>RD</span>
          </Link>
          <div className="legal-nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={isActive(link.href) ? "is-active" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="legal-container">
        <div className="legal-meta-line">Diet By RD — Legal Documents&nbsp;&nbsp; v1.0</div>
        <header className="legal-title-card">
          <div className="legal-brand-title">DIET BY RD</div>
          <h1 className="legal-document-title">{title}</h1>
          <div className="legal-effective">Effective Date: {lastUpdated} &nbsp;·&nbsp; Version 1.0</div>
        </header>
        {introCallout ? <div className="legal-intro-callout">{introCallout}</div> : null}
        {Children.map(children, renderLegalNode)}
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
