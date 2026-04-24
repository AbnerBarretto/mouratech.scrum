const fs = require("fs");
const path = require("path");

const replacement = `        <div class="logo-container flex items-center gap-4 cursor-pointer" onclick="window.location.href='index.html'">
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-mark transition-transform duration-300 hover:scale-105">
            <path d="M24 10C24 7.23858 26.2386 5 29 5H40C49.3888 5 57 12.6112 57 22C57 31.3888 49.3888 39 40 39H24V10Z" fill="#6366F1"/>
            <path d="M24 25H44C51.732 25 58 31.268 58 39C58 46.732 51.732 53 44 53H29C26.2386 53 24 50.7614 24 48V25Z" fill="#10B981"/>
            <circle cx="24" cy="32" r="5" fill="#1d4ed8"/>
          </svg>
          <div class="flex flex-col text-left">
            <span class="text-white text-2xl font-black tracking-tighter leading-none">Belo<span class="text-indigo-300">Eventos</span></span>
            <span class="text-indigo-200/60 text-[8px] font-bold uppercase tracking-[0.4em] mt-1">Cultura e Conexão</span>
          </div>
        </div>`;

const dir = "c:\\Users\\20252ewbj0056\\Documents\\Frontend\\belo_eventos";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));

files.forEach((file) => {
  const filePath = path.join(dir, file);
  let original = fs.readFileSync(filePath, "utf8");

  // Convert bad utf-8 encoding back to proper utf-8 characters using a trick:
  let content = original;
  try {
    content = decodeURIComponent(escape(original));
  } catch (e) {
    // If escape/decode fails, just attempt specific replacements
    content = original.replace(/PROGRAMAÃ‡Ã£O/g, "PROGRAMAÇÃO");
  }

  content = content
    .replace(/PROGRAMAÃ‡Ã£O/g, "PROGRAMAÇÃO")
    .replace(/InscriÃ§Ãµes/g, "Inscrições")
    .replace(/VocÃª/g, "Você")
    .replace(/MÃºsica/g, "Música")
    .replace(/sÃ¡bado/g, "sábado")
    .replace(/SÃ¡bado/g, "Sábado");

  // Replace the logo (handling whitespace strictly with regex)
  const logoRegex =
    /<div class="flex items-center gap-2 group cursor-pointer">[\s\S]*?<a href="index\.html">[\s\S]*?<span[\s\S]*?>Belo Eventos<\/span>[\s\S]*?<\/a>\s*<\/div>/;

  if (logoRegex.test(content)) {
    content = content.replace(logoRegex, replacement);
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated ${file}`);
  } else {
    console.log(`No match in ${file}`);
    // Let's also rewrite if encoding changed
    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Fixed encoding in ${file}`);
    }
  }
});

console.log("Done");
