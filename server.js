const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');
const { extractImageData } = require('image-data-extractor');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/images', async (req, res) => {
    try {
        const tags = req.query.tags || 'rating:safe';
        const url = `https://e621.net/posts.json?limit=10&tags=${encodeURIComponent(tags)}`;
        const headers = {
            'User-Agent': 'RobloxGame (by your_email@example.com)',
        };

        const response = await axios.get(url, { headers });
        const posts = response.data.posts || [];

        const imagesData = [];

        for (const post of posts) {
            const file = post.file;
            if (!file || !file.url) continue;

            // Skip .webm, .gif, .mp4
            if (/\.(mp4|webm|gif)$/i.test(file.url)) continue;

            try {
                const imageResponse = await axios.get(file.url, { responseType: 'arraybuffer' });
                const resized = await sharp(imageResponse.data)
                    .resize(64, 64, { fit: 'inside' }) // Ajuste para sua UI
                    .toFormat('jpeg')
                    .toBuffer();

                const { width, height, data } = await extractImageData(resized);

                // Envia os dados como array numérico
                imagesData.push({
                    width,
                    height,
                    pixels: Array.from(data), // Uint8Array => number[]
                });
            } catch (imgErr) {
                console.error('Erro ao processar imagem:', imgErr);
            }
        }

        res.json(imagesData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar imagens.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
