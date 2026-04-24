const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src/pages', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace relative paths with absolute paths using @ alias
    let newContent = content
      .replace(/from '\.\.\//g, "from '@/")
      .replace(/from "\.\.\//g, 'from "@/')
      .replace(/from '\.\.\/\.\.\//g, "from '@/")
      .replace(/from "\.\.\/\.\.\//g, 'from "@/');
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated imports in ${filePath}`);
    }
  }
});
