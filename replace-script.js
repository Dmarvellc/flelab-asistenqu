const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/api/hospital/**/*.ts');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const regex = /(?<!session_hospital_user_id\"\)\?\.value \?\? )cookieStore\.get\(\"app_user_id\"\)\?\.value/g;
    if (regex.test(content)) {
        content = content.replace(regex, 'cookieStore.get(\"session_hospital_user_id\")?.value ?? cookieStore.get(\"app_user_id\")?.value');
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
