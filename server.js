const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/', async (req, res) => {
  const { tags = 'rating:safe', page = 1 } = req.body;

  try {
    // Example: fetch multiple images (limit 3 here)
    const url = `https://e621.net/posts.json?limit=3&page=${page}&tags=${encodeURIComponent(tags)}`;
    const headers = { 'User-Agent': 'RobloxGame/1.0 (by your_email@example.com)' };

    const response = await axios.get(url, { headers });
    const posts = response.data.posts || [];

    if (posts.length === 0) {
      return res.status(404).json({ error: 'No posts found' });
    }

    const images = [];

    for (const post of posts) {
      const file = post.file;
      if (!file || !file.url || /\.(mp4|webm|gif)$/i.test(file.url)) {
        continue; // skip unsupported files
      }

      // Fetch image as buffer
      const imageRes = await axios.get(file.url, { responseType: 'arraybuffer' });
      // Convert to PNG buffer using sharp
      const pngBuffer = await sharp(imageRes.data).png().toBuffer();
      // Convert PNG buffer to base64 string
      const base64data = pngBuffer.toString('base64');
      // Wrap base64 inside Lua multiline string brackets
      const wrappedBase64 = `[[\n${base64data}\n]]`;

      // Push image info with wrapped base64, width, height
      const metadata = await sharp(pngBuffer).metadata();

      images.push({
        base64: wrappedBase64,
        width: metadata.width,
        height: metadata.height
      });
    }

    res.json({ images });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch or process images' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server listening');
});
