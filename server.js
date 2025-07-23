const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/images', async (req, res) => {
  try {
    const tags = req.query.tags;
    const url = `https://e621.net/posts.json?limit=10&tags=${encodeURIComponent(tags)}`;

    const headers = {
      'User-Agent': 'RobloxGame/1.0 (by your_email@example.com)',
    };

    const response = await axios.get(url, { headers });
    const posts = response.data.posts || [];

    const imagesData = [];

    for (const post of posts) {
      const file = post.file;
      if (!file || !file.url) continue;

      // Skip videos/gifs
      if (/\.(mp4|webm|gif)$/i.test(file.url)) continue;

      try {
        const imageResponse = await axios.get(file.url, { responseType: 'arraybuffer' });

        // Resize + get raw RGBA data
        const { data, info } = await sharp(imageResponse.data)
          .resize(64, 64, { fit: 'inside' })
          .raw()
          .toBuffer({ resolveWithObject: true });

        imagesData.push({
          width: info.width,
          height: info.height,
          pixels: Array.from(data), // Uint8Array to Array
        });
      } catch (err) {
        console.error('Failed to process image:', file.url, err.message);
      }
    }

    res.json(imagesData);
  } catch (err) {
    console.error('Error fetching e621 posts:', err.message);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
