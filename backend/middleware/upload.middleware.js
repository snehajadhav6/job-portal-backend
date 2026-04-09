const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'job-platform',
      resource_type: 'auto', // important for pdf + images
      format: file.mimetype.split('/')[1],
      public_id: file.originalname.split('.')[0],
    };
  },
});

const upload = multer({ storage });

module.exports = upload;