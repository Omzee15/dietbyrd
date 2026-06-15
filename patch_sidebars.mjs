import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/pages/**/*.tsx');

let changedFiles = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('subtitle="Admin Panel"') && content.includes('useAuth')) {
    content = content.replace(/subtitle="Admin Panel"/g, 'subtitle={user?.name || "Admin Panel"}');
    changed = true;
  }
  
  if (content.includes('subtitle="Support Team"') && content.includes('useAuth')) {
    content = content.replace(/subtitle="Support Team"/g, 'subtitle={user?.name || "Support Team"}');
    changed = true;
  }
  
  if (content.includes('subtitle="Admin"') && content.includes('useAuth')) {
    content = content.replace(/subtitle="Admin"/g, 'subtitle={user?.name || "Admin"}');
    changed = true;
  }
  
  if (content.includes('subtitle="Doctor Portal"') && content.includes('useAuth')) {
    content = content.replace(/subtitle="Doctor Portal"/g, 'subtitle={user?.name || "Doctor Portal"}');
    changed = true;
  }
  
  if (content.includes('subtitle="Dietician Portal"') && content.includes('useAuth')) {
    content = content.replace(/subtitle="Dietician Portal"/g, 'subtitle={user?.name || "Dietician Portal"}');
    changed = true;
  }
  
  if (content.includes('subtitle="MLT Intern"') && content.includes('useAuth')) {
    content = content.replace(/subtitle="MLT Intern"/g, 'subtitle={user?.name || "MLT Intern"}');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Updated: ' + file);
  }
}
console.log('Total files changed: ' + changedFiles);
