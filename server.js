const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json()); // parse JSON POST body

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

      // Skip videos/gifs
      if (/\.(mp4|webm|gif)$/i.test(file.url)) continue;

      try {
        // Download image
        const imageResponse = await axios.get(file.url, { responseType: 'arraybuffer' });

        // Resize + convert to raw RGBA pixel data
        const { data, info } = await sharp(imageResponse.data)
          .resize(64, 64, { fit: 'inside' })
          .jpeg() // convert to jpeg (optional)
          .raw()
          .toBuffer({ resolveWithObject: true });

        images.push({
          width: info.width,
          height: info.height,
          pixels: Array.from(data)
        });
      } catch (err) {
        console.error('Error processing image:', file.url, err.message);
      }
    }

    res.json({ images });
  } catch (err) {
    console.error('Error fetching posts:', err.message);
    res.status(500).json({ error: 'Failed to fetch or process images' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
