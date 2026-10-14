# DEPLOY: VPS Ubuntu 24

Target: `https://jual.mietek.tech`. Nginx dan Node.js sudah terpasang di VPS. Aplikasi berjalan di port lokal `3100` lewat pm2, dengan Nginx di depannya untuk HTTPS.

## 1. DNS (sekali saja)

Di pengelola domain `mietek.tech`, tambahkan record:

| Tipe | Nama | Nilai |
|---|---|---|
| A | `jual` | IP publik VPS |

Cek dari komputer lokal (tunggu beberapa menit setelah dibuat):

```bash
dig +short jual.mietek.tech
```

## 2. Persiapan server (sekali saja)

```bash
node -v                      # minimal v20
sudo apt update
sudo apt install -y build-essential python3   # untuk better-sqlite3 jika perlu kompilasi
sudo npm install -g pm2
sudo apt install -y certbot python3-certbot-nginx
```

## 3. Unggah kode

Pilih salah satu.

**Lewat git** (disarankan):

```bash
sudo mkdir -p /var/www && sudo chown $USER /var/www
cd /var/www
git clone <URL-REPO> self-inspection
```

**Lewat scp** (dari komputer lokal, tanpa `node_modules` dan `data/`):

```bash
rsync -av --exclude node_modules --exclude data ./ user@IP-VPS:/var/www/self-inspection/
```

## 4. Jalankan aplikasi

```bash
cd /var/www/self-inspection
npm ci --omit=dev            # atau: npm install --omit=dev
PORT=3100 pm2 start server.js --name self-inspection
pm2 save
pm2 startup                  # ikuti perintah yang dicetak agar otomatis jalan setelah reboot
curl http://127.0.0.1:3100/healthz   # harus: ok
```

## 5. Nginx

Buat `/etc/nginx/sites-available/jual.mietek.tech`:

```nginx
server {
    listen 80;
    server_name jual.mietek.tech;

    client_max_body_size 64k;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/jual.mietek.tech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. HTTPS

Kamera dan mikrofon **tidak akan jalan tanpa HTTPS**.

```bash
sudo certbot --nginx -d jual.mietek.tech
```

Pilih opsi redirect HTTP → HTTPS jika ditanya. Certbot menambahkan blok `listen 443 ssl` ke file konfigurasi di atas dan mengatur perpanjangan otomatis.

Cek: buka `https://jual.mietek.tech/healthz` di browser.

## 7. Update setelah ada perubahan

```bash
cd /var/www/self-inspection
git pull                     # atau rsync ulang
npm ci --omit=dev            # hanya jika package.json berubah
pm2 restart self-inspection
```

## Perintah berguna

```bash
pm2 logs self-inspection     # lihat log
pm2 status
sqlite3 data/reports.db "select id, created_at from reports order by created_at desc limit 10;"
cp data/reports.db ~/backup-reports-$(date +%F).db    # backup
```

## Masalah umum

| Gejala | Penyebab & solusi |
|---|---|
| `502 Bad Gateway` | Aplikasi tidak jalan. Cek `pm2 status` / `pm2 logs`, dan pastikan port 3100 |
| Kamera tidak muncul dialog izin | Halaman dibuka lewat `http://`. Pastikan HTTPS aktif (langkah 6) |
| `npm ci` gagal di better-sqlite3 | Pasang `build-essential python3` (langkah 2), lalu ulangi |
| certbot gagal verifikasi | DNS belum mengarah ke VPS (langkah 1), atau port 80 tertutup firewall (`sudo ufw allow 'Nginx Full'`) |
