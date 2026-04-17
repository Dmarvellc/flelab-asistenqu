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

    if (content.includes('userId.value')) {
        content = content.replace(/userId\.value/g, 'userId');
        changed = true;
    }
    if (content.includes('userId?.value')) {
        content = content.replace(/userId\?\.value/g, 'userId');
        changed = true;
    }


    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Fixed .value in ' + file);
    }
});
