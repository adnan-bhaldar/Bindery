import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── Tailwind class merger ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
}

// ─── Format file size ─────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ─── Format duration ──────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
    const mins = Math.floor(ms / 60_000)
    const secs = Math.floor((ms % 60_000) / 1000)
    return `${mins}m ${secs}s`
}

// ─── Generate unique ID ───────────────────────────────────────────────────────

export function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Clamp number ─────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

// ─── Throttle ─────────────────────────────────────────────────────────────────

export function throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    limit: number
): (...args: Parameters<T>) => void {
    let lastCall = 0
    return (...args: Parameters<T>) => {
        const now = Date.now()
        if (now - lastCall >= limit) {
            lastCall = now
            fn(...args)
        }
    }
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Chunk array ─────────────────────────────────────────────────────────────

export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size))
    }
    return chunks
}

// ─── Hash blob for duplicate detection ───────────────────────────────────────

export async function hashBlob(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ─── Check if image is landscape ─────────────────────────────────────────────

export function isLandscape(width: number, height: number): boolean {
    return width > height
}

// ─── Create object URL and track for cleanup ─────────────────────────────────

const trackedUrls = new Set<string>()

export function createTrackedObjectUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob)
    trackedUrls.add(url)
    return url
}

export function revokeTrackedObjectUrl(url: string): void {
    URL.revokeObjectURL(url)
    trackedUrls.delete(url)
}

export function revokeAllTrackedObjectUrls(): void {
    trackedUrls.forEach((url) => URL.revokeObjectURL(url))
    trackedUrls.clear()
}

// ─── Sanitize filename ────────────────────────────────────────────────────────

export function sanitizeFilename(name: string): string {
    return name
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}

// ─── Get image dimensions from blob ──────────────────────────────────────────

export function getImageDimensions(
    blob: Blob
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
            URL.revokeObjectURL(url)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to load image'))
        }
        img.src = url
    })
}

// ─── Format date ──────────────────────────────────────────────────────────────

export function formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(timestamp))
}

// ─── Format relative time ─────────────────────────────────────────────────────

export function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return formatDate(timestamp)
}

// ─── Reorder array (for dnd-kit) ─────────────────────────────────────────────

export function reorderArray<T>(
    array: T[],
    fromIndex: number,
    toIndex: number
): T[] {
    const result = [...array]
    const [removed] = result.splice(fromIndex, 1)
    result.splice(toIndex, 0, removed)
    return result
}

// ─── Pick keys from object ────────────────────────────────────────────────────

export function pick<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
): Pick<T, K> {
    return keys.reduce(
        (acc, key) => {
            acc[key] = obj[key]
            return acc
        },
        {} as Pick<T, K>
    )
}