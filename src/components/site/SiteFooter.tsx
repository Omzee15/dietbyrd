import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PublicBookingModal } from "@/components/PublicBookingModal";

// The one footer used across every public page (Landing, Contact, Reviews,
// and the auth page) -- previously each page hand-copied its own version.
export function SiteFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <style>
        {`.landing-footer {
  background: var(--navy);
  color: rgba(255,255,255,0.68); padding: clamp(48px, 8vw, 64px) clamp(20px, 5vw, 32px) 40px; border-top: 1px solid rgba(255,255,255,0.08);
}
.footer-email {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 13.5px; color: rgba(255, 255, 255, 0.8);
  text-decoration: none; margin-top: 14px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px; transition: all 0.2s;
}
.footer-email:hover { color: #fff; background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.25); }
.footer-inner { max-width: 1200px; margin: 0 auto; }
.footer-top { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.footer-brand .fb-logo { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 10px; }
.footer-brand .fb-logo span { color: var(--gold); }
.footer-brand p { font-size: 13.5px; line-height: 1.8; color: rgba(255,255,255,0.58); font-weight: 300; max-width: 280px; }
.footer-col h5 { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; margin-bottom: 16px; }
.footer-col h4 { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 12px; }
.footer-col a { display: block; font-size: 13.5px; color: rgba(255,255,255,0.6); text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
.footer-col a:hover { color: #fff; }
.footer-col ul { list-style: none; padding: 0; margin: 0; }
.footer-col li { margin-bottom: 10px; }
.footer-col ul li a { font-size: 13px; color: rgba(255,255,255,.6); text-decoration: none; transition: color 0.2s; }
.footer-col ul li a:hover { color: #fff; }
.footer-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 28px; flex-wrap: wrap; gap: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
.footer-bottom p { font-size: 13px; color: rgba(255,255,255,0.5); }
.footer-badges { display: flex; gap: 10px; flex-wrap: wrap; }
.f-badge { font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 500; background: var(--teal-l); color: var(--teal); border: 1px solid rgba(11,110,79,0.15); }
@media (max-width: 900px) {
  .footer-top { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .footer-bottom { flex-direction: column; align-items: flex-start; }
  .footer-bottom p { text-align: left; }
  .footer-top { grid-template-columns: 1fr; gap: 32px; }
}
`}
      </style>

      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="fb-logo">Diet By <span>RD</span></div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '-6px', marginBottom: '10px' }}>The Gold Standard Clinical Nutrition</div>
              <p>India's first clinical nutrition platform where every consultation is exclusively with a Registered Dietitian. Evidence-based. Affordable. Honest.</p>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@dietbyrd.com" target="_blank" rel="noopener noreferrer" className="footer-email">✉️ hello@dietbyrd.com</a>
              <div style={{ marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', width: 'max-content', maxWidth: '100%', textAlign: 'left' }}>
                Registered Office: DPT 808B F 79 &amp; 80, 8TH FLOOR DLF PRIME TOWER,<br />
                Okhla Industrial Estate, New Delhi, South Delhi- 110020, Delhi
              </div>
            </div>
            <div id="footer-platform" className="footer-col">
              <h5>Platform</h5>
              <a href="#" onClick={(e) => { e.preventDefault(); setIsBookingModalOpen(true); }}>Book Consultation</a>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <a href="#rd-section" onClick={scrollTo("rd-section")}>Why RD?</a>
              <Link to="/join">For Doctors</Link>
              <Link to="/join">Join as Dietitian</Link>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a></li>
                <li><a href="/terms" target="_blank" rel="noopener">Terms of Service</a></li>
                <li><a href="/refund" target="_blank" rel="noopener">Refund Policy</a></li>
                <li><a href="/cancellation" target="_blank" rel="noopener">Cancellation Policy</a></li>
                <li style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>CIN: U86909DL2026PTC466538</li>
                <li style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Udyam: UDYAM-DL-08-0127249</li>
              </ul>
            </div>
            <div id="contact" className="footer-col">
              <h5>Support</h5>
              <Link to="/contact">Contact / Support</Link>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@dietbyrd.com" target="_blank" rel="noopener noreferrer">hello@dietbyrd.com</a>
              <div style={{ fontSize: '13.5px', color: 'var(--text3)', marginBottom: '10px' }}>
                Grievance: <a href="https://mail.google.com/mail/?view=cm&fs=1&to=grievance@dietbyrd.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>grievance@dietbyrd.com</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Diet By RD Private Limited · All rights reserved.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <a href="https://www.instagram.com/dietbyrd/?hl=en" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram
              </a>
              <a href="https://www.youtube.com/@DietByRD" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </a>
              <a href="https://www.linkedin.com/company/dietbyrd/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </a>
              <a href="https://x.com/DietByRD" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter
              </a>
              <a href="https://www.facebook.com/dietbyrd" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </a>
              <div className="footer-badges">
                <span className="f-badge">DPDPA Compliant</span>
                <span className="f-badge">EUGDPR Aligned</span>
                <span className="f-badge">256-bit SSL</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <PublicBookingModal open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen} />
    </>
  );
}
