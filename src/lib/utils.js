import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Resize + re-encode an image File so its base64 fits within Netlify's 1 MB limit.
// Logos: keep PNG (preserves transparency), cap at 800px, quality 0.9 for JPEG types.
export function compressImageForUpload(file, maxDim = 800) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / img.width, maxDim / img.height)
      const w = Math.max(1, Math.round(img.width  * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const ext     = outMime === 'image/png' ? '.png' : '.jpg'
      canvas.toBlob(blob => {
        const reader = new FileReader()
        reader.onerror = reject
        reader.onload  = () => resolve({
          base64:   reader.result.split(',')[1],
          mimeType: outMime,
          fileName: file.name.replace(/\.[^.]+$/, ext),
        })
        reader.readAsDataURL(blob)
      }, outMime, 0.9)
    }
    img.src = url
  })
}
