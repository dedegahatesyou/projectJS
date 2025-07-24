const express = require("express");
const axios = require("axios");
const sharp = require("sharp");
const qoijs = require("qoijs"); // npm install qoijs
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.json());

app.post("/", async (req, res) => {
  const { tags, page } = req.body;

  if (!tags) {
    return res.status(400).json({ error: "Missing tags" });
  }

  try {
    const query = new URLSearchParams({
      tags: tags,
      page: page || "1",
      limit: "3"
    }).toString();

    const url = `https://e621.net/posts.json?${query}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "RobloxImageBridge/1.0 (by yourusername on e621)"
      }
    });

    const posts = response.data.posts || [];

    // Process posts concurrently
    const images = await Promise.all(posts.map(async (post) => {
      try {
        const fileUrl = post?.file?.url;
        if (!fileUrl || /\.(mp4|webm|gif)$/i.test(fileUrl)) {
          return null; // skip unsupported files
        }

        // Download image data as buffer
        const imgResponse = await axios.get(fileUrl, { responseType: "arraybuffer" });
        const imgBuffer = Buffer.from(imgResponse.data);

        // Use sharp to decode and get raw RGBA pixels + metadata
        const image = sharp(imgBuffer);
        const { width, height } = await image.metadata();
        const rawRGBA = await image.raw().toBuffer();

        // Encode raw RGBA to QOI format (4 channels)
        const qoiBuffer = qoijs.encode(rawRGBA, width, height, 4);

        // Convert QOI buffer to base64 string
        const qoiBase64 = qoiBuffer.toString("base64");

        return {
          base64: qoiBase64,
          width,
          height
        };
      } catch (err) {
        console.warn("Failed to process image:", err.message);
        return null;
      }
    }));

    // Filter out nulls from failed images
    const validImages = images.filter(Boolean);

    return res.json({ images: validImages });

  } catch (err) {
    console.error("Failed to fetch or process images:", err.message);
    return res.status(500).json({ error: "Failed to fetch or process images" });
  }
});

app.listen(PORT, () => {
  console.log(`Image server running on port ${PORT}`);
});
