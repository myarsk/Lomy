const fs = require('fs');
const path = require('path');

const uploadDir = '/var/www/html/dist/img/uploads';

function uploadFile(file, userName) {
  try {
    const copyLocation = path.join(uploadDir, `${userName}_${file.originalname}`);
    fs.copyFileSync(file.path, copyLocation);
  } catch (err) {
    console.error(err);
    throw new Error(`Could not store file ${file.originalname}. Please try again!`);
  }
}

module.exports = { uploadFile };