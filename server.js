const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
      return res.status(404).json({ error: 'No posts found' });
    }

    const post = posts[0];
    const file = post.file;

    if (!file || !file.url || /\.(mp4|webm|gif)$/i.test(file.url)) {
      return res.status(400).json({ error: 'Invalid or unsupported file' });
    }

    // Download image as buffer
    const imageRes = await axios.get(file.url, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageRes.data);

    // Convert image to PNG buffer in memory using sharp
    const pngBuffer = await sharp(imageBuffer)
      .png()
      .toBuffer();

    // Convert PNG buffer to base64 string
    const base64String = pngBuffer.toString('base64');

    // Return JSON with base64 PNG string
    res.json({
      tags,
      page,
      pngBase64: base64String
    });

  } catch (err) {
    console.error('Error fetching or processing image:', err.message);
    res.status(500).json({ error: 'Failed to fetch or process image' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
