/**
 * ImagePicker
 * Step 4 — browse images from the client's Google Drive folder and select up to 3.
 */
import { useEffect, useState } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { fetchDriveImages } from '../lib/api'

const MAX_IMAGES = 3

export default function ImagePicker() {
  const [images, setImages]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const { selectedClient, selectedImages, setSelectedImages } = useCampaignStore((s) => ({
    selectedClient:   s.selectedClient,
    selectedImages:   s.selectedImages,
    setSelectedImages: s.setSelectedImages,
  }))

  useEffect(() => {
    if (!selectedClient?.googleDrive?.folderId) {
      setError('No Google Drive folder configured for this client.')
      setLoading(false)
      return
    }
    fetchDriveImages({ folderId: selectedClient.googleDrive.folderId })
      .then(setImages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedClient])

  function toggleImage(img) {
    const already = selectedImages.find((i) => i.id === img.id)
    if (already) {
      setSelectedImages(selectedImages.filter((i) => i.id !== img.id))
    } else if (selectedImages.length < MAX_IMAGES) {
      setSelectedImages([...selectedImages, img])
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Loading images from Google Drive…</p>
  if (error)   return <p className="text-red-500 text-sm">{error}</p>

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Select up to {MAX_IMAGES} images.{' '}
        <span className="text-brand-700 font-medium">{selectedImages.length}/{MAX_IMAGES} selected.</span>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
        {images.map((img) => {
          const isSelected = selectedImages.some((i) => i.id === img.id)
          const isDisabled = !isSelected && selectedImages.length >= MAX_IMAGES
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => toggleImage(img)}
              disabled={isDisabled}
              className={[
                'relative rounded-xl overflow-hidden border-2 aspect-square transition-all',
                isSelected  ? 'border-brand-700 shadow-md' : 'border-transparent',
                isDisabled  ? 'opacity-40 cursor-not-allowed' : 'hover:border-brand-400',
              ].join(' ')}
            >
              <img src={img.thumbnailUrl} alt={img.name} className="w-full h-full object-cover" />
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-brand-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {selectedImages.findIndex((i) => i.id === img.id) + 1}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
