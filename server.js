const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/getimages', async (req, res) => {
    const tags = req.query.tags || 'cute';
    try {
        const { data } = await axios.get('https://e621.net/posts.json', {
            headers: {
                'User-Agent': 'MyRobloxGame/1.0 (by yourname on e621)',
            },
            params: { tags, limit: 5 }
        });

        const results = [];
        for (const post of data.posts) {
            const url = post.sample.url || post.file.url;
            const imgResp = await axios.get(url, { responseType: 'arraybuffer' });

            const buffer = await sharp(imgResp.data)
                .resize(128, 128)
                .jpeg({ quality: 80 })
                .raw()
                .toBuffer({ resolveWithObject: true });

            results.push({
                width: buffer.info.width,
                height: buffer.info.height,
                data: Buffer.from(buffer.data).toString('base64')
            });
        }

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Image fetch failed' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
