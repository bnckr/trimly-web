import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// necessário no ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// caminho da logo
const source = path.join(process.cwd(), 'public', 'logo', 'trimly.png')

// pasta de saída
const outputDir = path.join(process.cwd(), 'public', 'icons')

// valida logo
if (!fs.existsSync(source)) {
  console.error('❌ Logo não encontrada em: public/logo/trimly.png')
  process.exit(1)
}

// cria pasta
fs.mkdirSync(outputDir, { recursive: true })

async function generateIcon(size) {
  await sharp(source)
    .resize(size, size, {
      fit: 'contain',
      background: '#c7dae6',
    })
    .png()
    .toFile(path.join(outputDir, `icon-${size}.png`))
}

// executa
Promise.all([
  generateIcon(192),
  generateIcon(512)
])
  .then(() => {
    console.log('✅ Ícones gerados com sucesso!')
  })
  .catch((err) => {
    console.error('❌ Erro:', err)
  })