const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');
const zlib = require('zlib');
const { encode } = require('@mattiasbuelens/qoi');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/', async (req, res) => {
  const { tags = 'rating:safe', page = 1 } = req.body;

  try {
    const url = `https://e621.net/posts.json?limit=1&page=${page}&tags=${encodeURIComponent(tags)}`;
    const headers = { 'User-Agent': 'RobloxGame/1.0 (by your_email@example.com)' };

    const response = await axios.get(url, { headers });
    const posts = response.data.posts || [];

    if (posts.length === 0) {
      return res.status(404).send('-- no posts found --');
    }

    const post = posts[0];
    const fileUrl = post.file?.url;

    if (!fileUrl || /\.(mp4|webm|gif)$/i.test(fileUrl)) {
      return res.status(400).send('-- unsupported file --');
    }

    const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    const rawBuffer = await image.raw().toBuffer();

    // QOI encode
    const qoiBuffer = encode({
      width,
      height,
      channels: 4,
      colorspace: 0,
      data: rawBuffer
    });

    // Base64 encode QOI
    const qoiBase64 = qoiBuffer.toString('base64');

    // zlib deflate that base64
    zlib.deflate(Buffer.from(qoiBase64), (err, compressed) => {
      if (err) {
        console.error('Compression error:', err);
        return res.status(500).send('-- compression failed --');
      }

      const finalBase64 = compressed.toString('base64');

      const lua = `
data = {
  images = {
    {
      base64 = "${finalBase64}",
      width = ${width},
      height = ${height}
    }
  }
}
`.trim();

      res.type('text/plain').send(lua);
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('-- fetch/process failed --');
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
