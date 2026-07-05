const fs = require('fs');
const path = require('path');

// Recursively find all route.ts files
function findRouteFiles(dir, results = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      findRouteFiles(fullPath, results);
    } else if (item.name === 'route.ts' || item.name === 'page.tsx') {
      results.push(fullPath);
    }
  }
  return results;
}

// Regex: find Thai characters in URL strings (inside new URL("..." or redirect("..."
// Thai unicode range: \u0E00-\u0E7F
const thaiInUrlPattern = /new URL\("([^"]*[\u0E00-\u0E7F][^"]*)"|redirect\("([^"]*[\u0E00-\u0E7F][^"]*)"/g;

const files = findRouteFiles('src/app');
let fixed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  content = content.replace(thaiInUrlPattern, (match, url1, url2) => {
    const url = url1 || url2;
    // Split into path and query parts
    const qIdx = url.indexOf('?');
    if (qIdx === -1) return match; // no query, skip

    const basePath = url.substring(0, qIdx);
    const queryStr = url.substring(qIdx + 1);

    // Encode each key=value pair
    const params = new URLSearchParams(queryStr);
    const encoded = params.toString();
    const newUrl = `${basePath}?${encoded}`;

    if (url1) {
      modified = true;
      return `new URL(\`${newUrl}\``;
    } else {
      modified = true;
      return `redirect(\`${newUrl}\``;
    }
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('FIXED: ' + file);
    fixed++;
  }
}

console.log('\nTotal files fixed: ' + fixed);