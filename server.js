// Server Self Inspection.
// M1: hanya menyajikan folder public/ dan /healthz. API laporan menyusul di M6.
const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 3100;
const app = express();

// Server berada di belakang Nginx, jadi percaya header X-Forwarded-*
app.set('trust proxy', 1);

app.get('/healthz', (req, res) => res.type('text').send('ok'));

// File statis. no-cache selama prototipe supaya perubahan JS/CSS langsung terlihat di HP.
app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders(res, filePath) {
      if (/\.(js|css)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    },
  })
);

app.listen(PORT, () => console.log(`Self Inspection berjalan di http://localhost:${PORT}`));
