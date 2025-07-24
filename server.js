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
    // Fetch one image from e621 with the given tags and page
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

    // Download the image as buffer
    const imageRes = await axios.get(file.url, { responseType: 'arraybuffer' });
    const inputBuffer = Buffer.from(imageRes.data);

    // Convert to PNG raw pixels and encode as base64 (raw RGBA)
    const rawBuffer = await sharp(inputBuffer)
      .raw()
      .toBuffer();

    // Get image dimensions
    const metadata = await sharp(inputBuffer).metadata();

    // Encode raw pixels as base64 string
    const base64RawPixels = rawBuffer.toString('base64');

    // Wrap the base64 string as Lua multiline string with return
    const luaResponse = `[[
${base64RawPixels}
]]`;

    res.type('text/plain').send(luaResponse);

  } catch (err) {
    console.error('Error fetching or processing image:', err.message);
    res.status(500).json({ error: 'Failed to fetch or process image' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
