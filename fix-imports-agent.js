const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = `${dir}/${file}`;
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
            files.push(name);
        }
    }
    return files;
}

const files = getFiles('src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Remove bad imports injected in auth-cookies.ts
    if (file.endsWith('auth-cookies.ts')) {
        let lines = content.split('\n');
        lines = lines.filter(line => !line.startsWith('import { getHospitalUserIdFromCookies }') && !line.startsWith('import { getAdminAgencyUserIdFromCookies }'));
        const newContent = lines.join('\n');
        if (newContent !== content) {
            content = newContent;
            changed = true;
        }
    } else {
        if (content.includes('getAgentUserIdFromCookies()') && !content.includes('import { getAgentUserIdFromCookies }')) {
            content = 'import { getAgentUserIdFromCookies } from "@/lib/auth-cookies";\n' + content;
            changed = true;
        }
    }


    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Fixed imports in ' + file);
    }
});
