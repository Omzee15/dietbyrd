import fs from 'fs';
let content = fs.readFileSync('src/pages/SupportDashboard.tsx', 'utf8');

// For patient:
content = content.replace(
  /<p className="text-xs text-muted-foreground">\{patient\.phone\}.*?<\/p>/g,
  '<p className="text-xs text-muted-foreground">{patient.phone} \u00B7 {patient.email || "No email"} \u00B7 {patient.state || "Unknown"}</p>'
);

// For doctor:
content = content.replace(
  /<p className="text-xs text-muted-foreground">\{doctor\.phone\}<\/p>/g,
  '<p className="text-xs text-muted-foreground">{doctor.phone} \u00B7 {doctor.email || "No email"}</p>'
);

// For dietician:
content = content.replace(
  /<p className="text-xs text-muted-foreground">\{dietician\.specialization\} .*? \{dietician\.phone\}<\/p>/g,
  '<p className="text-xs text-muted-foreground">{dietician.specialization} \u00B7 {dietician.phone} \u00B7 {dietician.email || "No email"}</p>'
);

fs.writeFileSync('src/pages/SupportDashboard.tsx', content);
console.log("Updated SupportDashboard cards via regex");
