const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const getImageData = require('get-image-data'); // from Velover's project
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/getimages', async (req, res) => {
	const tags = ((req.query.tags || '') + ' rating:safe').trim();

	try {
		const { data } = await axios.get('https://e621.net/posts.json', {
			headers: { 'User-Agent': 'MyRobloxGame/1.0 (by you)' },
			params: { tags, limit: 5 }
		});

		const results = [];

		for (const post of data.posts) {
			const url = post.sample?.url || post.file?.url;
			const ext = post.file?.ext;

			if (!url || !ext) continue;
			if (['mp4', 'webm', 'gif'].includes(ext)) continue;

			try {
				const imgResp = await axios.get(url, { responseType: 'arraybuffer' });

				// Resize and convert image to PNG in memory
				const resizedBuffer = await sharp(imgResp.data)
					.resize(128, 128)
					.png()
					.toBuffer();

				// Use Velover's module to extract pixel data
				const { data: pixelData, width, height } = await new Promise((resolve, reject) => {
					getImageData(resizedBuffer, (err, imageData) => {
						if (err) reject(err);
						else resolve(imageData);
					});
				});

				results.push({
					width,
					height,
					data: Buffer.from(pixelData).toString('base64'),
				});
			} catch (err) {
				console.warn("Erro ao processar imagem:", url, err.message);
			}
		}

		res.json({ images: results });
	} catch (err) {
		console.error("Erro geral:", err.message);
		res.status(500).json({ error: 'Image fetch failed' });
	}
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running in port", port));
