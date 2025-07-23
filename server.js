const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp'); // <-- new dependency

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

    const tempDir = os.tmpdir();
    const inputJpgPath = path.join(tempDir, `input_${Date.now()}.jpg`);
    const inputPngPath = path.join(tempDir, `input_${Date.now()}.png`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.txt`);

    // Save original image temporarily as jpg (or original extension)
    fs.writeFileSync(inputJpgPath, imageBuffer);

    // Convert to PNG using sharp
    await sharp(inputJpgPath)
      .png()
      .toFile(inputPngPath);

    // Delete the original jpg to save space
    fs.unlinkSync(inputJpgPath);

    const exePath = path.join(__dirname, 'Image-Data-Extractor', 'Image-Data-Extractor.exe');

    execFile(exePath, [inputPngPath, outputPath], (error, stdout, stderr) => {
      // Delete PNG input after extraction
      fs.unlinkSync(inputPngPath);

      if (error) {
        console.error('Extractor error:', error.message);
        return res.status(500).json({ error: 'Image processing failed' });
      }

      try {
        const result = fs.readFileSync(outputPath, 'utf8').trim();
        fs.unlinkSync(outputPath);

        // Wrap in Roblox-ready Lua format
        const wrapped = `return\n\t[[\n${result}\n\t]]`;

        res.type('text/plain').send(wrapped);
      } catch (readErr) {
        console.error('Read error:', readErr.message);
        res.status(500).json({ error: 'Failed to read output' });
      }
    });

  } catch (err) {
    console.error('Error fetching image:', err.message);
    res.status(500).json({ error: 'Failed to fetch or process image' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
