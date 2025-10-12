const express = require("express");
const axios = require("axios");
const sharp = require("sharp");
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
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        const resizedBuffer = await sharp(imageBuffer)
          .resize(256, 256)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        const pixelData = resizedBuffer.data.toString('base64');

        images.push({
          pixelData,
          width: 256,
          height: 256
        });

        console.log(`Processed image: ${fileUrl}`);

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
