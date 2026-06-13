import fs from 'fs';

let content = fs.readFileSync('src/pages/DoctorDashboard.tsx', 'utf8');
content = content.replace(/\r\n/g, '\n');

const startTag = '<a href="mailto:doctors@dietbyrd.com"';
const endTag = '<span>Contact Support</span>\n        </a>';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag) + endTag.length;

if (startIndex === -1 || content.indexOf(endTag) === -1) {
  console.log("Could not find contact support block!");
} else {
  const newContact = `<DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-all duration-150">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-[18px] h-[18px] shrink-0" />
                <span>Contact Support</span>
              </div>
              <ChevronUp className="w-4 h-4 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-2 border-sidebar-accent/20 bg-sidebar shadow-lg rounded-xl">
            <div className="flex flex-col gap-1 p-1">
              <a href="mailto:doctors@dietbyrd.com" className="flex items-center gap-3 px-2 py-2.5 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary-foreground rounded-lg transition-colors">
                <Mail className="w-[16px] h-[16px] text-sidebar-foreground/70" />
                <span>doctors@dietbyrd.com</span>
              </a>
              <a href="tel:+918000000000" className="flex items-center gap-3 px-2 py-2.5 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary-foreground rounded-lg transition-colors">
                <Phone className="w-[16px] h-[16px] text-sidebar-foreground/70" />
                <span>+91 80000 00000</span>
              </a>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>`;

  content = content.slice(0, startIndex) + newContact + content.slice(endIndex);
  fs.writeFileSync('src/pages/DoctorDashboard.tsx', content);
  console.log("Replaced Contact Support.");
}
