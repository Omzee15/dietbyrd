const fs = require('fs');
const content = fs.readFileSync('src/pages/Landing.tsx', 'utf8');
const replacement = {Array(6).fill([
                  { label: 'DPDPA Compliant, Strict NDA Policy', img: '/dpdpa.png' },
                  { label: 'IDA Verified RDs', icon: BadgeCheck },
                  { label: 'EU GDPR Compliant', img: '/gdpr.png' },
                  { label: 'Aligned with ISO 27001 standards' },
                ]).flat().map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {item.img ? (
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
                        <img src={item.img} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : item.icon ? (
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
                        <item.icon size={40} strokeWidth={2} style={{ color: 'var(--teal)' }} />
                      </div>
                    ) : null}
                    <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </div>
                  </div>
                ))};

const startMarker = "              {Array(4).fill([";
const endMarker = "              ))}
            </div>";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);
if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + "              " + replacement + "\n" + content.substring(endIndex);
  fs.writeFileSync('src/pages/Landing.tsx', newContent);
  console.log('Replaced successfully');
} else {
  console.log('Markers not found', startIndex, endIndex);
}
