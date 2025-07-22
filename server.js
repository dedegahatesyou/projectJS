const express = require('express')
const axios = require('axios')
const sharp = require('sharp')

const app = express()
app.use(express.json())

// Função que baixa a imagem, redimensiona e retorna pixels RGB em array
async function getImagePixels(url, width, height) {
  const response = await axios({
    url,
    responseType: 'arraybuffer',
  })

  const imageBuffer = Buffer.from(response.data, 'binary')

  // redimensiona e extrai pixels RGB (raw buffer)
  const resized = await sharp(imageBuffer)
    .resize(width, height)
    .removeAlpha()
    .raw()
    .toBuffer()

  const pixelsArray = Array.from(resized) // converte Buffer em array para JSON

  return {
    width,
    height,
    pixels: pixelsArray,
  }
}

// Endpoint principal que recebe tags e página, retorna pixels de 1 imagem (exemplo fixo)
app.post('/', async (req, res) => {
  const { tags, page } = req.body
  console.log('Tags:', tags, 'Page:', page)

  try {
    // Exemplo: você implementa aqui a busca real no e621 e pega a URL da imagem
    const imageUrl = 'https://static1.e621.net/data/sample/fe/33/fe33d7f5c710f67d3934a2ed13e8b64b.jpg' 

    const pixelData = await getImagePixels(imageUrl, 128, 128)
    res.json({ images: [pixelData] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`))
