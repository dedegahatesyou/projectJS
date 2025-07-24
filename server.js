const express = require("express");
const fetch = require("node-fetch");
const sharp = require("sharp");

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
    const { tags, page } = req.body;

    try {
        // Example endpoint: https://e621.net/posts.json?tags=example
        const query = new URLSearchParams({
            tags: tags || "",
            page: page || "1",
            limit: "3"
        }).toString();

        const response = await fetch(`https://e621.net/posts.json?${query}`, {
            headers: {
                "User-Agent": "MyRobloxBot/1.0 (by username on e621)"
            }
        });

        const data = await response.json();
        const posts = data.posts || [];

        const images = await Promise.all(posts.map(async (post) => {
            try {
                const fileUrl = post?.file?.url;
                if (!fileUrl) return null;

                const imgBuffer = await fetch(fileUrl).then(res => res.buffer());

                // Convert to PNG and get base64 string
                const pngBuffer = await sharp(imgBuffer).png().toBuffer();
                const base64 = pngBuffer.toString("base64");

                const { width, height } = await sharp(pngBuffer).metadata();

                return {
                    base64,
                    width,
                    height
                };
            } catch (err) {
                console.warn("Failed to process image:", err);
                return null;
            }
        }));

        const validImages = images.filter(Boolean);
        res.json({ images: validImages });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch or process images" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Image server running on port ${PORT}`);
});
