const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = `${dir}/${file}`;
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else if (name.endsWith('.ts')) {
            files.push(name);
        }
    }
    return files;
}

const files = getFiles('src/app/api/agent');
const importStmt = 'import { getAgentUserIdFromCookies } from "@/lib/auth-cookies";\n';

let updatedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Replace the specific userId assignment
    const userIdRegex = /const\s+userId\s*=\s*cookieStore\.get\("session_agent_user_id"\)\?\.value(?:(\s*\?\?\s*cookieStore\.get\("app_user_id"\)\?\.value))?;/g;
    if (userIdRegex.test(content)) {
        content = content.replace(userIdRegex, 'const userId = await getAgentUserIdFromCookies();');
        changed = true;
    }

    // 2. Also replace single expression check without assigning userId
    const bareCheckRegex = /cookieStore\.get\("session_agent_user_id"\)\?\.value(?:(\s*\?\?\s*cookieStore\.get\("app_user_id"\)\?\.value))?;/g;
    if (bareCheckRegex.test(content) && content.includes('const userId = ') === false) {
        content = content.replace(bareCheckRegex, 'await getAgentUserIdFromCookies();');
        changed = true;
    } else if (content.match(bareCheckRegex)) {
        // If it got replaced already in step 1, that's fine. 
        // If step 1 missed it because it was not `const userId`, we replace it here.
        // It's possible there are stray usages. Let's do a simple replace just in case:
        content = content.replace(bareCheckRegex, 'await getAgentUserIdFromCookies();');
    }

    if (changed) {
        if (!content.includes('getAgentUserIdFromCookies')) {
             const lastImportIndex = content.lastIndexOf('import ');
             if (lastImportIndex !== -1) {
                 const endOfLastImport = content.indexOf('\n', lastImportIndex);
                 content = content.slice(0, endOfLastImport + 1) + importStmt + content.slice(endOfLastImport + 1);
             } else {
                 content = importStmt + content;
             }
        }
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
        updatedCount++;
    }
});

console.log(`Total files updated: ${updatedCount}`);
