const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');
const zlib = require('zlib');
const fs = require('fs');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Path to your QOI encoder executable
const QOI_ENCODER_PATH = path.join(__dirname, 'qoi_encoder.exe');

app.post('/', async (req, res) => {
  const { tags = 'rating:safe', page = 1 } = req.body;

  try {
    const url = `https://e621.net/posts.json?limit=1&page=${page}&tags=${encodeURIComponent(tags)}`;
    const headers = { 'User-Agent': 'RobloxGame/1.0 (by your_email@example.com)' };

    const response = await axios.get(url, { headers });
    const posts = response.data.posts || [];

    if (posts.length === 0) {
      return res.status(404).json({ error: 'No posts found' });
    }

    const post = posts[0];
    const fileUrl = post.file?.url;

    if (!fileUrl || /\.(mp4|webm|gif)$/i.test(fileUrl)) {
      return res.status(400).json({ error: 'Invalid or unsupported file type' });
    }

    // Download image as buffer
    const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Use sharp to decode image and get width/height metadata
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Save PNG buffer temporarily
    const tempPngPath = path.join(__dirname, 'temp.png');
    await fs.promises.writeFile(tempPngPath, imageBuffer);

    // Run the QOI encoder exe on the saved PNG
    execFile(QOI_ENCODER_PATH, [tempPngPath], async (error, stdout, stderr) => {
      try {
        // Delete temp PNG file
        await fs.promises.unlink(tempPngPath);
      } catch {}

      if (error) {
        console.error('QOI encoder error:', error, stderr);
        return res.status(500).json({ error: 'QOI encoding failed' });
      }

      // stdout expected to be the QOI base64 string (no extra formatting)
      const qoiBase64 = stdout.trim();

      // Compress with zlib deflate
      zlib.deflate(Buffer.from(qoiBase64, 'base64'), (err, compressedBuffer) => {
        if (err) {
          console.error('Compression error:', err);
          return res.status(500).json({ error: 'Compression failed' });
        }

        const compressedBase64 = compressedBuffer.toString('base64');

        // Return JSON with width, height and compressed base64 QOI data
        res.json({
          images: [
            {
              width: metadata.width,
              height: metadata.height,
              base64: compressedBase64,
            },
          ],
        });
      });
    });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch or process image' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
