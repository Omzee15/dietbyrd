import fs from 'fs';

// Doctor Dashboard
let doctor = fs.readFileSync('src/pages/DoctorDashboard.tsx', 'utf8');
if (!doctor.includes('<span className="text-sm font-medium">{user?.name}</span>')) {
  doctor = doctor.replace(
    /<\/div>\n\n\s*\{user\?\.role === "doctor" && \(\n\s*<div className="flex items-center gap-2">/,
    `</div>\n            <div className="flex items-center gap-3">\n              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">\n                {user?.name?.charAt(0).toUpperCase()}\n              </div>\n              <span className="text-sm font-medium">{user?.name}</span>\n            </div>\n\n            {user?.role === "doctor" && (\n              <div className="flex items-center gap-2">`
  );
  fs.writeFileSync('src/pages/DoctorDashboard.tsx', doctor);
}

// Dietician Dashboard
let dietician = fs.readFileSync('src/pages/DieticianDashboard.tsx', 'utf8');
if (!dietician.includes('<span className="text-sm font-medium">{user?.name}</span>')) {
  dietician = dietician.replace(
    /<h1 className="text-xl font-bold">Dietician Dashboard<\/h1>/,
    '<h1 className="text-xl font-bold">Dietician Dashboard</h1>\n            <div className="flex items-center gap-3">\n              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">\n                {user?.name?.charAt(0).toUpperCase()}\n              </div>\n              <span className="text-sm font-medium">{user?.name}</span>\n            </div>'
  );
  fs.writeFileSync('src/pages/DieticianDashboard.tsx', dietician);
}

// MLT Intern Dashboard
let mlt = fs.readFileSync('src/pages/MLTInternDashboard.tsx', 'utf8');
if (!mlt.includes('<span className="text-sm font-medium">{user?.name}</span>')) {
  mlt = mlt.replace(
    /<h1 className="text-xl font-bold">MLT Dashboard<\/h1>/,
    '<h1 className="text-xl font-bold">MLT Dashboard</h1>\n            <div className="flex items-center gap-3">\n              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">\n                {user?.name?.charAt(0).toUpperCase()}\n              </div>\n              <span className="text-sm font-medium">{user?.name}</span>\n            </div>'
  );
  fs.writeFileSync('src/pages/MLTInternDashboard.tsx', mlt);
}

console.log("Updated headers");
