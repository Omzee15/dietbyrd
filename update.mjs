import fs from 'fs';

let appContent = fs.readFileSync('api/_app.mjs', 'utf8');

appContent = appContent.replace(
  /SELECT \s*rd\.\*,\s*u\.phone,\s*u\.is_active,\s*COUNT\(DISTINCT rp\.patient_id\) AS active_patients\s*FROM dietbyrd_registered_dietitians rd\s*LEFT JOIN dietbyrd_users u ON rd\.user_id = u\.id\s*LEFT JOIN dietbyrd_registered_patients rp ON rp\.assigned_rd_id = rd\.id\s*WHERE rd\.is_active = true\s*GROUP BY rd\.id, u\.phone, u\.is_active\s*ORDER BY rd\.created_at DESC/,
  `SELECT \n          rd.*,\n          u.phone,\n          u.email,\n          u.is_active,\n          COUNT(DISTINCT rp.patient_id) AS active_patients\n        FROM dietbyrd_registered_dietitians rd\n        LEFT JOIN dietbyrd_users u ON rd.user_id = u.id\n        LEFT JOIN dietbyrd_registered_patients rp ON rp.assigned_rd_id = rd.id\n        WHERE rd.is_active = true\n        GROUP BY rd.id, u.phone, u.email, u.is_active\n        ORDER BY rd.created_at DESC`
);

fs.writeFileSync('api/_app.mjs', appContent);

let apiContent = fs.readFileSync('src/lib/api.ts', 'utf8');
if (!apiContent.includes('email?: string;')) {
  apiContent = apiContent.replace(
    /export interface Doctor \{\n\s*id: number;/,
    `export interface Doctor {\n    id: number;\n    email?: string;`
  );
  apiContent = apiContent.replace(
    /export interface Dietician \{\n\s*id: number;/,
    `export interface Dietician {\n    id: number;\n    email?: string;`
  );
  fs.writeFileSync('src/lib/api.ts', apiContent);
}

let formContent = fs.readFileSync('src/components/JoinRequestForm.tsx', 'utf8');
if (!formContent.includes('const [emailError, setEmailError]')) {
  formContent = formContent.replace(
    'const [isSubmitting, setIsSubmitting] = useState(false);',
    'const [isSubmitting, setIsSubmitting] = useState(false);\n    const [emailError, setEmailError] = useState("");\n    const emailInputRef = React.useRef<HTMLInputElement>(null);'
  );
  formContent = formContent.replace(
    /import { useState, useEffect } from "react";/,
    `import React, { useState, useEffect } from "react";`
  );

  formContent = formContent.replace(
    /if \(!data\.success\) \{\n\s*throw new Error\(data\.error \|\| "Failed to submit join request"\);\n\s*\}/,
    `if (!data.success) {\n          if (data.error && data.error.includes("idx_users_email_unique")) {\n            setEmailError("This email id has already been registered with us. Please enter a different email id");\n            setTimeout(() => {\n              emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });\n              emailInputRef.current?.focus();\n            }, 100);\n            return;\n          }\n          throw new Error(data.error || "Failed to submit join request");\n        }`
  );

  formContent = formContent.replace(
    /<Input\n\s*type="email"\n\s*placeholder="your.email@example.com"\n\s*value=\{formData.email\}\n\s*onChange=\{\(e\) => handleChange\("email", e\.target\.value\)\}\n\s*\/>/g,
    `<Input\n              ref={emailInputRef}\n              type="email"\n              placeholder="your.email@example.com"\n              value={formData.email}\n              onChange={(e) => { handleChange("email", e.target.value); setEmailError(""); }}\n              className={emailError ? "border-red-500 focus-visible:ring-red-500" : ""}\n            />\n            {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}`
  );

  fs.writeFileSync('src/components/JoinRequestForm.tsx', formContent);
}

console.log("Updated api/_app.mjs, api.ts and JoinRequestForm.tsx");
