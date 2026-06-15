import fs from 'fs';

let content = fs.readFileSync('src/components/JoinRequestForm.tsx', 'utf8');

// 1. Add imports for Command and Popover
if (!content.includes('import { Command')) {
  content = content.replace(
    'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";',
    `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\nimport { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";\nimport { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";\nimport { Check, ChevronsUpDown } from "lucide-react";\nimport { cn } from "@/lib/utils";`
  );
}

// 2. Add state for popover and search
if (!content.includes('const [openCitySelect, setOpenCitySelect] = useState(false);')) {
  content = content.replace(
    'const [isSubmitting, setIsSubmitting] = useState(false);',
    'const [isSubmitting, setIsSubmitting] = useState(false);\n    const [openCitySelect, setOpenCitySelect] = useState(false);\n    const [citySearch, setCitySearch] = useState("");'
  );
}

// 3. Replace INDIAN_CITIES with a massive list
const massiveCities = `const INDIAN_CITIES = [
  "Mumbai","Delhi","Bengaluru","Hyderabad","Ahmedabad","Chennai","Kolkata","Surat","Pune","Jaipur",
  "Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal","Visakhapatnam","Pimpri-Chinchwad","Patna","Vadodara",
  "Ghaziabad","Ludhiana","Agra","Nashik","Faridabad","Meerut","Rajkot","Kalyan-Dombivali","Vasai-Virar","Varanasi",
  "Srinagar","Aurangabad","Dhanbad","Amritsar","Navi Mumbai","Allahabad","Ranchi","Howrah","Coimbatore","Jabalpur",
  "Gwalior","Vijayawada","Jodhpur","Madurai","Raipur","Kota","Chandigarh","Guwahati","Solapur","Hubli-Dharwad",
  "Mysuru","Tiruchirappalli","Bareilly","Aligarh","Tiruppur","Gurgaon","Moradabad","Jalandhar","Bhubaneswar","Salem",
  "Warangal","Guntur","Bhiwandi","Saharanpur","Gorakhpur","Bikaner","Amravati","Noida","Jamshedpur","Bhilai",
  "Cuttack","Firozabad","Kochi","Nellore","Bhavnagar","Dehradun","Durgapur","Asansol","Rourkela","Nanded",
  "Kolhapur","Ajmer","Akola","Gulbarga","Jamnagar","Ujjain","Loni","Siliguri","Jhansi","Ulhasnagar",
  "Jammu","Sangli-Miraj & Kupwad","Mangalore","Erode","Belgaum","Ambattur","Tirunelveli","Malegaon","Gaya","Jalgaon",
  "Udaipur","Maheshtala","Davanagere","Kozhikode","Kurnool","Rajpur Sonarpur","Rajahmundry","Bokaro","South Dumdum","Bellary",
  "Patiala","Gopalpur","Agartala","Bhagalpur","Muzaffarnagar","Bhatpara","Panihati","Latur","Dhule","Tirupati",
  "Rohtak","Korba","Bhilwara","Berhampur","Muzaffarpur","Ahmednagar","Mathura","Kollam","Avadi","Kadapa",
  "Kamarhati","Sambalpur","Bilaspur","Shahjahanpur","Satara","Bijapur","Rampur","Shivamogga","Chandrapur","Junagadh",
  "Thrissur","Alwar","Bardhaman","Kulti","Kakinada","Nizamabad","Parbhani","Tumkur","Khammam","Ozhukarai",
  "Bihar Sharif","Panipat","Darbhanga","Bally","Aizawl","Dewas","Ichalkaranji","Karnal","Bathinda","Jalna",
  "Eluru","Barasat","Purnia","Satna","Mau","Sonipat","Farrukhabad","Sagar","Durg","Imphal",
  "Ratlam","Hapur","Anantapur","Arrah","Karimnagar","Etawah","Ambernath","North Dumdum","Bharatpur","Begusarai",
  "New Delhi","Gandhidham","Baranagar","Tiruvottiyur","Puducherry","Sikar","Thoothukudi","Rewa","Mirzapur","Raichur",
  "Pali","Ramagundam","Haridwar","Vijayanagaram","Katihar","Nagercoil","Sri Ganganagar","Mango","Thanjavur","Bulandshahr",
  "Uluberia","Murwara","Haldia","Khandwa","Nandyal","Chittoor","Morena","Bhiwani","Orai","Phusro",
  "Vellore","Mehsana","Raiganj","Sirsa","Danapur","Serampore","Guna","Jaunpur","Panvel","Shivpuri",
  "Surendranagar Dudhrej","Unnao","Hugli-Chinsurah","Alappuzha","Kottayam","Machilipatnam","Shimla","Adoni","Tenali","Proddatur",
  "Saharsa","Hindupur","Sasaram","Hajipur","Bhimavaram","Deoghar","Madanapalle","Kumbakonam","Bongaigaon","Raigarh",
  "Bhusawal","Ooty","Dharmavaram","Guntakal","Srikakulam","Gudivada","Narasaraopet","Tadipatri","Chilakaluripet","Kavali",
  "Tadepalligudem","Amaravati","Others"
];`;
content = content.replace(/const INDIAN_CITIES = \[\s*[\s\S]*?\s*\];/, massiveCities);

// 4. Replace Select with Popover/Command for City
const citySelectRegex = /<Select value=\{formData\.clinic_address\}[^>]*>[\s\S]*?<\/Select>/;
const cityCombobox = `<Popover open={openCitySelect} onOpenChange={setOpenCitySelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCitySelect}
                    className="w-full justify-between font-normal text-left"
                  >
                    {formData.clinic_address || "Select city..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search or type city..." 
                      onValueChange={setCitySearch}
                      value={citySearch}
                    />
                    <CommandList>
                      <CommandEmpty className="p-2 text-sm text-center">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-primary"
                          onClick={() => {
                            handleChange("clinic_address", citySearch);
                            setOpenCitySelect(false);
                          }}
                        >
                          Use "{citySearch}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {INDIAN_CITIES.map((city) => (
                          <CommandItem
                            key={city}
                            value={city}
                            onSelect={(currentValue) => {
                              handleChange("clinic_address", city);
                              setOpenCitySelect(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.clinic_address === city ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {city}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>`;
content = content.replace(citySelectRegex, cityCombobox);

// 5. Restrict Experience to 0-80
content = content.replace(/onChange=\{\(e\) => handleChange\("experience_years", e.target.value\)\}/g, `onChange={(e) => {
                    let val = e.target.value;
                    if (val !== "") {
                      let num = parseInt(val);
                      if (num > 80) val = "80";
                      if (num < 0) val = "0";
                    }
                    handleChange("experience_years", val);
                  }}`);
content = content.replace(/max="80"/g, ""); // Remove if already exists to avoid duplicates
content = content.replace(/min="0"/g, 'min="0" max="80"');

fs.writeFileSync('src/components/JoinRequestForm.tsx', content);
console.log("Updated JoinRequestForm.tsx successfully!");
