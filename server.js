const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/', async (req, res) => {
  const { tags = 'rating:safe', page = 1, limit = 5 } = req.body; // add limit param for multiple images

  try {
    const url = `https://e621.net/posts.json?limit=${limit}&page=${page}&tags=${encodeURIComponent(tags)}`;
    const headers = {
      'User-Agent': 'RobloxGame/1.0 (by your_email@example.com)'
    };

    const response = await axios.get(url, { headers });
    const posts = response.data.posts || [];

    if (posts.length === 0) {
      return res.status(404).json({ error: 'No posts found' });
    }

    // Process all posts concurrently
    const imagesBase64 = await Promise.all(posts.map(async (post) => {
      const file = post.file;

      // Skip unsupported file types
      if (!file || !file.url || /\.(mp4|webm|gif)$/i.test(file.url)) {
        return null;
      }

      try {
        // Download image
        const imageRes = await axios.get(file.url, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageRes.data);

        // Convert to PNG
        const pngBuffer = await sharp(imageBuffer).png().toBuffer();

        // Encode to base64 (directly from buffer)
        return pngBuffer.toString('base64');

      } catch (err) {
        console.error('Error processing image:', err.message);
        return null;
      }
    }));

    // Filter out any nulls (failed downloads/conversions)
    const validImages = imagesBase64.filter(b64 => b64 !== null);

    res.json({
      images: validImages // Array of base64 PNG strings
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch or process images' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
