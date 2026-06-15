import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// For doctors
content = content.replace(
  /<div className="text-xs text-muted-foreground">\{d\.qualification\}<\/div>/g,
  '<div className="text-xs text-muted-foreground">{d.qualification}</div>\n                                {d.email && <div className="text-xs text-muted-foreground">{d.email}</div>}'
);

// We replaced it for both dieticians and doctors as they both use similar card structures
fs.writeFileSync('src/pages/AdminDashboard.tsx', content);

console.log("Updated AdminDashboard.tsx to show email");
