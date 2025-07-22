const express = require('express')
const axios = require('axios')
const sharp = require('sharp')

const app = express()
app.use(express.json())

app.post('/process-image', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: "URL não fornecida" })

    // Baixa imagem
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    const imageBuffer = Buffer.from(response.data)

    // Processa imagem
    const width = 128
    const height = 128

    // redimensiona e mantém canal alpha para usar no Roblox (RGBA)
    const rawBuffer = await sharp(imageBuffer)
      .resize(width, height)
      .raw()
      .toBuffer()

    // Opcional: comprimir rawBuffer para enviar menos dados
    // Por enquanto envia puro, mas pode enviar base64 para facilitar JSON
    const base64Pixels = rawBuffer.toString('base64')

    // Retorna para o Roblox com tamanho e pixels em base64
    res.json({
      width,
      height,
      pixelsBase64: base64Pixels
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
