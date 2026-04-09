const multer = require('multer');
const CloudinaryStorage = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = CloudinaryStorage({
  cloudinary: cloudinary,
  params: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    const baseName = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');

    const isPdf = ext.toLowerCase() === 'pdf';

    cb(null, {
      folder: 'job-platform',
      resource_type: isPdf ? 'image' : 'auto', // 'image' allows Cloudinary to serve PDFs without 401 restrictions
      public_id: `${baseName}_${Date.now()}`,
      format: isPdf ? 'pdf' : ext,
    });
  },
});

const upload = multer({ storage });

module.exports = upload;