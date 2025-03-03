# b34n auto swap

## Installasi

Ikuti langkah-langkah berikut untuk menginstal dan menjalankan proyek ini:

### 1. Clone Repository
```sh
git clone https://github.com/xninz007/b34n.git
cd b34n
```

### 2. Install Dependencies
```sh
npm install
```

### 3. Konfigurasi Wallets
Sebelum menjalankan aplikasi, atur private key dompet yang akan digunakan di file `wallets.json`.

Buat atau edit file `wallets.json` dengan format berikut:
```json
{
  "wallets": [
    "0xPK1",
    "0xPK2"
  ]
}
```
Gantilah `0xPK1` dan `0xPK2` dengan private key asli yang ingin digunakan.

> **Peringatan:** Jangan bagikan file `wallets.json` atau private key kepada siapa pun!

## Menjalankan Aplikasi
```sh
node index.js
```

## Lisensi
MIT

