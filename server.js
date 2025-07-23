const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');

// Importar o módulo Image-Data-Extractor localmente
const ImageDataExtractor = require(path.join(__dirname, 'Image-Data-Extractor'));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/', async (req, res) => {
  const { tags = 'rating:safe', page = 1 } = req.body;

  try {
    const url = `https://e621.net/posts.json?limit=10&page=${page}&tags=${encodeURIComponent(tags)}`;
    const headers = {
      'User-Agent': 'RobloxGame/1.0 (by your_email@example.com)'
    };

    const response = await axios.get(url, { headers });
    const posts = response.data.posts || [];

    const images = [];

    for (const post of posts) {
      const file = post.file;
      if (!file || !file.url) continue;

      // Ignora vídeos/gifs
      if (/\.(mp4|webm|gif)$/i.test(file.url)) continue;

      try {
        // Baixa a imagem original
        const imageResponse = await axios.get(file.url, { responseType: 'arraybuffer' });
        const inputBuffer = Buffer.from(imageResponse.data);

        // Usa sharp para redimensionar para 64x64 mantendo proporção, e converter para raw RGBA
        const { data: rawData, info } = await sharp(inputBuffer)
          .resize(64, 64, { fit: 'inside' })
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Usa o ImageDataExtractor para processar o buffer raw RGBA em string base64 compactada
        // Assumindo que ImageDataExtractor tenha um método assim:
        // extractBase64Compressed(buffer, width, height)
        const base64Compressed = ImageDataExtractor.extractBase64Compressed(rawData, info.width, info.height);

        images.push({
          width: info.width,
          height: info.height,
          data: base64Compressed // já compactado + codificado em base64
        });
      } catch (err) {
        console.error('Erro ao processar imagem:', file.url, err.message);
      }
    }

    res.json({ images });
  } catch (err) {
    console.error('Erro ao buscar posts:', err.message);
    res.status(500).json({ error: 'Falha ao buscar ou processar imagens' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ouvindo na porta ${PORT}`);
});
