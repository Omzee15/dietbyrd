const fs = require('fs');
const landing = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

// Use indexOf and substring instead of regex to avoid regex escaping issues
const navStart = landing.indexOf('<nav className={`landing-nav ${scrolled ? \'scrolled\' : \'\'}`}>');
const navEnd = landing.indexOf('</nav>', navStart) + 6;
const nav = landing.substring(navStart, navEnd);

const footerStart = landing.indexOf('<footer className="landing-footer">');
const footerEnd = landing.indexOf('</footer>', footerStart) + 9;
const footer = landing.substring(footerStart, footerEnd);

const styleStart = landing.indexOf('<style>{`');
const styleEnd = landing.indexOf('`}</style>', styleStart);
const style = landing.substring(styleStart + 9, styleEnd);

fs.writeFileSync('extracted.json', JSON.stringify({ nav, footer, style }));
