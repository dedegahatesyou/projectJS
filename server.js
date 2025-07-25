const express = require("express");
const axios = require("axios");
const sharp = require("sharp");
const qoijs = require("qoijs"); // npm install qoijs
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.json());

app.post('/', async (req, res) => {
  const { tags = 'rating:safe', page = 1 } = req.body;

  try {
    const url = `https://e621.net/posts.json?limit=3&page=${page}&tags=${encodeURIComponent(tags)}`;
    const headers = { 'User-Agent': 'RobloxGame/1.0 (by your_email@example.com)' };

    const response = await axios.get(url, { headers });
    const posts = response.data.posts || [];

    if (posts.length === 0) {
      console.log('No posts found for tags:', tags);
      return res.status(404).json({ error: 'No posts found' });
    }

    const images = [];

    for (const post of posts) {
      const fileUrl = post.file?.url;
      if (!fileUrl || /\.(mp4|webm|gif)$/i.test(fileUrl)) {
        console.log('Skipping unsupported file:', fileUrl);
        continue;
      }

      try {
        // Download image buffer
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        // Convert to PNG and get base64
        const pngBuffer = await sharp(imageBuffer).png().toBuffer();
        const metadata = await sharp(pngBuffer).metadata();
        const base64 = pngBuffer.toString('base64');

        images.push({
          base64,
          width: metadata.width,
          height: metadata.height
        });

        console.log(`Processed image: ${fileUrl} (Width: ${metadata.width}, Height: ${metadata.height})`);

      } catch (imgErr) {
        console.warn('Failed to process image:', fileUrl, imgErr.message);
      }
    }

    console.log(`Total images processed: ${images.length}`);
    res.json({ images });

  } catch (err) {
    console.error('Error fetching posts:', err.message);
    res.status(500).json({ error: 'Failed to fetch or process images' });
  }
});

app.listen(PORT, () => {
  console.log(`Image server running on port ${PORT}`);
});
