import fs from 'fs';

const file = 'c:/ClientWo/dietbyrd/src/pages/PatientDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add hasAutoOpenedProfile ref
if (!content.includes('const hasAutoOpenedProfile = useRef(false);')) {
  content = content.replace(
    /const \[expandedPlanId, setExpandedPlanId\] = useState<number \| null>\(null\);/,
    `const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);\n  const hasAutoOpenedProfile = useRef(false);`
  );
}

// 2. Add useEffect for auto-opening
if (!content.includes('// Auto-open profile modal if patient has paid but profile is incomplete')) {
  content = content.replace(
    /const isProfileIncomplete = patient && \(!patient\.age \|\| !patient\.gender \|\| !patient\.height \|\| !patient\.weight\);/,
    `const isProfileIncomplete = patient && (!patient.age || !patient.gender || !patient.height || !patient.weight);\n\n  // Auto-open profile modal if patient has paid but profile is incomplete\n  useEffect(() => {\n    if (hasPaid && isProfileIncomplete && !patientLoading && !hasAutoOpenedProfile.current) {\n      hasAutoOpenedProfile.current = true;\n      const t = setTimeout(() => {\n        openProfileCompletion();\n      }, 800);\n      return () => clearTimeout(t);\n    }\n  }, [hasPaid, isProfileIncomplete, patientLoading]);`
  );
}

// 3. Add Back to Home button
if (!content.includes('<h1 className="text-xl font-semibold">My Dashboard</h1>')) {
  // It might already be wrapped, let's just replace the Top bar section
} else {
  content = content.replace(
    /<h1 className="text-xl font-semibold">My Dashboard<\/h1>/,
    `<div className="flex items-center gap-3">\n            <Link to="/">\n              <Button variant="destructive" size="sm" className="flex items-center gap-1 bg-red-500 hover:bg-red-600 shadow-sm" title="Go back to Home Page">\n                <ChevronLeft className="w-4 h-4" />\n                Home\n              </Button>\n            </Link>\n            <h1 className="text-xl font-semibold">My Dashboard</h1>\n          </div>`
  );
}

fs.writeFileSync(file, content);
console.log('Patched PatientDashboard.tsx');
