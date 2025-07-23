const express = require("express");
const axios = require("axios");
const sharp = require("sharp");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "10mb" }));

app.post("/", async (req, res) => {
  const { tags, page } = req.body;

  if (!tags) return res.status(400).json({ error: "Missing tags" });

  try {
    const url = `https://e621.net/posts.json?tags=${encodeURIComponent(tags)}&page=${page || 1}&limit=3`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "RobloxImageBridge/1.0 (by yourusername on e621)"
      }
    });

    const posts = response.data.posts || [];

    const images = [];

    for (const post of posts) {
      try {
        const imageUrl = post.file?.url;
        if (!imageUrl) continue;

        const imageRes = await axios.get(imageUrl, { responseType: "arraybuffer" });

        const sharpImage = sharp(imageRes.data).png();
        const metadata = await sharpImage.metadata();
        const pngBuffer = await sharpImage.toBuffer();

        const base64 = pngBuffer.toString("base64");

        images.push({
          base64,
          width: metadata.width,
          height: metadata.height
        });
      } catch (err) {
        console.warn("Failed to process one image:", err.message);
      }
    }

    return res.json({ images });
  } catch (err) {
    console.error("Main request failed:", err.message);
    return res.status(500).json({ error: "Failed to fetch images" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
