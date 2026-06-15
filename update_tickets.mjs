import fs from 'fs';
let content = fs.readFileSync('src/pages/SupportDashboard.tsx', 'utf8');

content = content.replace(
  /\{ticket\.comment_count > 0 && ` \u00B7 \$\{ticket\.comment_count\} comments`\}/,
  '{ticket.comment_count > 0 && ` \u00B7 ${ticket.comment_count} comments`}\n                              {ticket.assigned_to_name ? ` \u00B7 \uD83D\uDC64 ${ticket.assigned_to_name}` : " \u00B7 \uD83D\uDC64 Unassigned"}'
);

// Add top right user name in the main dashboard view
content = content.replace(
  /<div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">/,
  '<div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">\n        <div className="h-14 border-b flex items-center justify-between px-6 bg-card shrink-0">\n          <h1 className="text-xl font-bold">Support Dashboard</h1>\n          <div className="flex items-center gap-3">\n            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">\n              {user?.name?.charAt(0).toUpperCase()}\n            </div>\n            <span className="text-sm font-medium">{user?.name}</span>\n          </div>\n        </div>'
);

// remove the title from the Tabs area if it's there
content = content.replace(
  /<div className="flex items-center justify-between mb-8">\n\s*<div>\n\s*<h1 className="text-3xl font-bold tracking-tight">Support Dashboard<\/h1>\n\s*<p className="text-muted-foreground mt-1">\n\s*Manage support tickets, patients, and staff\n\s*<\/p>\n\s*<\/div>\n\s*<\/div>/,
  '<div className="mb-8">\n              <p className="text-muted-foreground mt-1">\n                Manage support tickets, patients, and staff\n              </p>\n            </div>'
);

fs.writeFileSync('src/pages/SupportDashboard.tsx', content);
console.log("Updated SupportDashboard");
