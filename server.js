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
    const headers = {
      'User-Agent': 'RobloxGame/1.0 (by your_email@example.com)'
    };

    const response = await axios.get(url, { headers });
    const posts = response.data.posts || [];

    if (posts.length === 0) {
      return res.status(404).json({ images: [] });
    }

    const post = posts[0];
    const fileUrl = post.file?.url;

    if (!fileUrl || /\.(mp4|webm|gif)$/i.test(fileUrl)) {
      return res.status(400).json({ images: [] });
    }

    // Download image buffer
    const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Decode image to raw RGBA
    const image = sharp(imageBuffer).ensureAlpha();
    const metadata = await image.metadata();
    const { width, height } = metadata;

    const rawBuffer = await image.raw().toBuffer();

    // Encode raw RGBA buffer to QOI
    const qoiBuffer = encode({
      width,
      height,
      channels: 4,
      colorspace: 0,
      data: rawBuffer
    });

    // Compress QOI buffer with zlib.deflate (async)
    zlib.deflate(qoiBuffer, (err, compressedBuffer) => {
      if (err) {
        console.error('Compression error:', err);
        return res.status(500).json({ images: [] });
      }

      // Encode compressed buffer to base64
      const base64 = compressedBuffer.toString('base64');

      // Respond with JSON
      res.json({
        images: [
          {
            base64,
            width,
            height
          }
        ]
      });
    });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ images: [] });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
