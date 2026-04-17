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

    if (content.includes('getHospitalUserIdFromCookies()') && !content.includes('import { getHospitalUserIdFromCookies }')) {
        content = 'import { getHospitalUserIdFromCookies } from "@/lib/auth-cookies";\n' + content;
        changed = true;
    }

    if (content.includes('getAdminAgencyUserIdFromCookies()') && !content.includes('import { getAdminAgencyUserIdFromCookies }')) {
        content = 'import { getAdminAgencyUserIdFromCookies } from "@/lib/auth-cookies";\n' + content;
        changed = true;
    }

    if (content.includes('adminIdCookie')) {
        content = content.replace(/adminIdCookie/g, 'userId');
        changed = true;
    }
    if (content.includes('userIdCookie')) {
        content = content.replace(/userIdCookie/g, 'userId');
        changed = true;
    }
    if (content.includes('sessionUserId')) {
        content = content.replace(/sessionUserId/g, 'userId');
        changed = true;
    }


    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Fixed imports in ' + file);
    }
});
