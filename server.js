const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/getimages', async (req, res) => {
	const tags = ((req.query.tags || '') + ' rating:safe').trim();

	try {
		const { data } = await axios.get('https://e621.net/posts.json', {
			headers: {
				'User-Agent': 'MyRobloxGame/1.0 (by you on e621)',
			},
			params: { tags, limit: 5 }
		});

		const results = [];

		for (const post of data.posts) {
			const url = post.sample?.url || post.file?.url;
			const ext = post.file?.ext;

			// Filter out mp4, webm, gif
			if (!url || !ext) continue;
			if (['mp4', 'webm', 'gif'].includes(ext)) continue;

			try {
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
			} catch (imageErr) {
				console.warn("Erro ao processar imagem:", url, imageErr.message);
			}
		}

		res.json({ images: results });
	} catch (err) {
		console.error("Erro geral:", err.message);
		res.status(500).json({ error: 'Image fetch failed' });
	}
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
