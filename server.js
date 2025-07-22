const express = require('express')
const axios = require('axios')
const sharp = require('sharp')

const app = express()
app.use(express.json())

// Função para buscar URL da imagem original no e621 via API
async function getImageUrlFromE621(tags, page) {
  const url = `https://e621.net/posts.json?tags=${encodeURIComponent(tags)}&page=${page}&limit=1`
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'SeuNomeAqui - seuemail@example.com' } // Mude para algo seu
  })

  if (response.data.posts && response.data.posts.length > 0) {
    return response.data.posts[0].file.url
  }
  throw new Error('Nenhuma imagem encontrada para as tags: ' + tags)
}

// Função que baixa a imagem, redimensiona e retorna pixels RGBA em array
async function getImagePixels(url, width, height) {
  const response = await axios({
    url,
    responseType: 'arraybuffer',
  })

  const imageBuffer = Buffer.from(response.data, 'binary')

  const resized = await sharp(imageBuffer)
    .resize(width, height)
    // removeAlpha removido para manter canal alpha
    .raw()
    .toBuffer()

  const pixelsArray = Array.from(resized) // Cada pixel tem 4 bytes: R, G, B, A

  return {
    width,
    height,
    pixels: pixelsArray,
  }
}

app.post('/', async (req, res) => {
  const { tags, page } = req.body
  console.log('Tags:', tags, 'Page:', page)

  try {
    const imageUrl = await getImageUrlFromE621(tags, page)
    console.log('Imagem encontrada:', imageUrl)

    const pixelData = await getImagePixels(imageUrl, 128, 128)
    res.json({ images: [pixelData] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
