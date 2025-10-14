const express = require("express");
const axios = require("axios");
const sharp = require("sharp");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.json());

let cachedPosts = [];
let currentIndex = 0;

app.post('/fetch-posts', async (req, res) => {
  const { tags = 'order:hot', page = 1, limit = 30 } = req.body;
  
  const maxLimit = 320;
  const validLimit = Math.min(Math.max(parseInt(limit) || 30, 1), maxLimit);

  try {
    const url = `https://e621.net/posts.json?limit=${validLimit}&page=${page}&tags=${encodeURIComponent(tags)}`;
    const headers = { 'User-Agent': 'RobloxGame/1.0 (by your_email@example.com)' };

    const response = await axios.get(url, { headers });
    cachedPosts = response.data.posts || [];
    currentIndex = 0;

    if (cachedPosts.length === 0) {
      console.log('No posts found for tags:', tags);
      return res.status(404).json({ error: 'No posts found', count: 0 });
    }

    console.log(`Fetched ${cachedPosts.length} posts`);
    res.json({ success: true, count: cachedPosts.length });

  } catch (err) {
    console.error('Error fetching posts:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/get-next-image', async (req, res) => {
  // Skip videos/gifs and find the next valid image
  while (currentIndex < cachedPosts.length) {
    const post = cachedPosts[currentIndex];
    const fileUrl = post.file?.url;

    if (fileUrl && !/\.(mp4|webm|gif)$/i.test(fileUrl)) {
      break; // Found a valid image
    }
    currentIndex++;
  }

  if (currentIndex >= cachedPosts.length) {
    return res.json({ success: false, message: 'No more images' });
  }

  const post = cachedPosts[currentIndex];
  const fileUrl = post.file?.url;

  try {
    const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    const resizedBuffer = await sharp(imageBuffer)
      .resize(512, 512)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelData = resizedBuffer.data.toString('base64');

    currentIndex++;

    res.json({
      success: true,
      pixelData,
      width: 256,
      height: 256,
      originalWidth: originalWidth,
      originalHeight: originalHeight,
      rating: post.rating,
      postId: post.id,
      remaining: cachedPosts.length - currentIndex
    });

  } catch (err) {
    console.warn('Failed to process image:', fileUrl, err.message);
    currentIndex++;
    return res.json({ success: false, message: 'Failed to process image' });
  }
});

app.listen(PORT, () => {
  console.log(`Image server running on port ${PORT}`);
});
