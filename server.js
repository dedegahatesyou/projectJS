const express = require("express");
const cors = require("cors");
const axios = require("axios");
const sharp = require("sharp");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/", async (req, res) => {
  try {
    const { tags, page } = req.body;
    const url = `https://e621.net/posts.json?tags=${encodeURIComponent(tags)}&page=${page || 1}&limit=3`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "RobloxProxy/1.0 (by yourusername on e621)"
      }
    });

    const json = await response.json();
    const posts = json.posts || [];

    const results = [];

    for (const post of posts) {
      if (!post.file || !post.file.url || !post.file.ext) continue;

      const imageResponse = await axios.get(post.file.url, { responseType: "arraybuffer" });

      const pngBuffer = await sharp(imageResponse.data)
        .resize({ width: 256 }) // optional
        .png()
        .toBuffer();

      const base64 = pngBuffer.toString("base64");

      results.push({
        base64: base64,
        width: post.file.width,
        height: post.file.height,
        id: post.id
      });
    }

    res.json({ images: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
