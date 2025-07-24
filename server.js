const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');
const zlib = require('zlib');

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
      return res.status(404).json({ error: 'No posts found' });
    }

    const post = posts[0];
    const fileUrl = post.file?.url;

    if (!fileUrl || /\.(mp4|webm|gif)$/i.test(fileUrl)) {
      return res.status(400).json({ error: 'Invalid or unsupported file type' });
    }

    // Download image as buffer
    const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Use sharp to decode and extract raw RGBA pixels
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    const raw = await image.raw().toBuffer(); // raw RGBA buffer

    // Compress raw pixel buffer using zlib deflate
    zlib.deflate(raw, (err, compressedBuffer) => {
      if (err) {
        console.error('Compression error:', err);
        return res.status(500).json({ error: 'Compression failed' });
      }

      const base64 = compressedBuffer.toString('base64');

      // Return JSON with width, height and pixelBase64 string (no Lua wrapper here)
      res.json({
        width: metadata.width,
        height: metadata.height,
        base64: base64
      });
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch or process image' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
