import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { ACCEPTED_IMAGE_MIME_TYPES } from '@/constants'

export function useGlobalDropZone(onDrop: (files: File[]) => void) {
    const { setDropZoneActive } = useUIStore()

    useEffect(() => {
        let dragCounter = 0

        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault()
            dragCounter++

            const hasImageFiles = Array.from(e.dataTransfer?.items ?? []).some(
                (item) =>
                    item.kind === 'file' &&
                    ACCEPTED_IMAGE_MIME_TYPES.includes(item.type)
            )

            if (hasImageFiles) {
                setDropZoneActive(true)
            }
        }

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault()
            dragCounter--
            if (dragCounter === 0) {
                setDropZoneActive(false)
            }
        }

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault()
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy'
            }
        }

        const handleDrop = (e: DragEvent) => {
            e.preventDefault()
            dragCounter = 0
            setDropZoneActive(false)

            const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
                ACCEPTED_IMAGE_MIME_TYPES.includes(f.type)
            )

            if (files.length > 0) {
                onDrop(files)
            }
        }

        window.addEventListener('dragenter', handleDragEnter)
        window.addEventListener('dragleave', handleDragLeave)
        window.addEventListener('dragover', handleDragOver)
        window.addEventListener('drop', handleDrop)

        return () => {
            window.removeEventListener('dragenter', handleDragEnter)
            window.removeEventListener('dragleave', handleDragLeave)
            window.removeEventListener('dragover', handleDragOver)
            window.removeEventListener('drop', handleDrop)
        }
    }, [onDrop, setDropZoneActive])
}