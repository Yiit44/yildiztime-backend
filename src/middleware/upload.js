const multer = require('multer');
const path = require('path');

// Dosya boyutu limitleri (byte cinsinden)
const FILE_LIMITS = {
  image: 5 * 1024 * 1024,    // Resimler için 5MB
  video: 15 * 1024 * 1024,   // Videolar için 15MB
  audio: 5 * 1024 * 1024,    // Ses dosyaları için 5MB
  document: 10 * 1024 * 1024 // Dokümanlar için 10MB
};

// Desteklenen dosya tipleri
const MIME_TYPES = {
  // Resimler
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  
  // Videolar
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/webm': 'webm',
  
  // Ses
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  
  // Dokümanlar
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'application/rtf': 'rtf'
};

// Dosya kayıt yolunu ve ismini ayarla
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // uploads klasörüne kaydet
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    // Orijinal dosya adını temizle
    const originalName = file.originalname.toLowerCase().replace(/[^a-z0-9.]/g, '-');
    // Benzersiz isim oluştur
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Dosya uzantısını al
    const ext = MIME_TYPES[file.mimetype] || 'bin';
    // Dosya adını oluştur
    cb(null, `${uniqueSuffix}-${originalName}.${ext}`);
  }
});

// Dosya tipini ve boyutunu kontrol et
const fileFilter = (req, file, cb) => {
  // Desteklenen dosya tiplerini kontrol et
  if (!MIME_TYPES[file.mimetype]) {
    cb(new Error('Desteklenmeyen dosya tipi! Sadece resim, video, ses ve ofis dokümanları gönderilebilir.'), false);
    return;
  }

  // Dosya tipi için boyut limitini belirle
  let sizeLimit = FILE_LIMITS.document; // varsayılan limit
  if (file.mimetype.startsWith('image/')) {
    sizeLimit = FILE_LIMITS.image;
  } else if (file.mimetype.startsWith('video/')) {
    sizeLimit = FILE_LIMITS.video;
  } else if (file.mimetype.startsWith('audio/')) {
    sizeLimit = FILE_LIMITS.audio;
  }

  // Dosya boyutunu kontrol et
  if (parseInt(req.headers['content-length']) > sizeLimit) {
    cb(new Error(`Dosya boyutu çok büyük! Maksimum boyut: ${sizeLimit / (1024 * 1024)}MB`), false);
    return;
  }

  cb(null, true);
};

// Multer ayarlarını yap
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_LIMITS.video, // en büyük limit (video için)
    files: 1 // tek seferde 1 dosya
  }
});

module.exports = upload; 