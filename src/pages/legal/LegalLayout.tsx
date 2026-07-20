import { Children, ReactElement, ReactNode, cloneElement, isValidElement } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
  introCallout?: ReactNode;
};

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
        .legal-page a:hover { color: var(--teal-m); }

        @media (max-width: 700px) {
          .legal-container { padding: 112px 20px 72px; }
          .legal-title-card { padding: 40px 24px; margin-bottom: 44px; }
          .legal-brand-title { font-size: 30px; }
          .legal-document-title { font-size: 22px; }
          .legal-section-heading { gap: 12px; }
          .legal-section-number { font-size: 26px; }
          .legal-section-title { font-size: 20px; }
          .legal-intro-callout { padding: 20px; margin-bottom: 48px; }
        }
      `}</style>

      <SiteHeader />

      <main className="legal-container">
        <div className="legal-meta-line">Diet By RD — Legal Documents&nbsp;&nbsp; v1.0</div>
        <header className="legal-title-card">
          <div className="legal-brand-title">DIET BY RD</div>
          <h1 className="legal-document-title">{title}</h1>
          <div className="legal-effective">Effective Date: {lastUpdated} &nbsp;·&nbsp; Version 1.0</div>
        </header>
        {introCallout ? <div className="legal-intro-callout">{introCallout}</div> : null}
        {Children.map(children, renderLegalNode)}
      </main>

      <SiteFooter />
    </div>
  );
};

export default LegalLayout;
