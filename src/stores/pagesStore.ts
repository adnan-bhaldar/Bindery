import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Page, PageRotation, PageMargin, ImageFit, CustomMargin } from '@/types'
import { generateId, reorderArray } from '@/lib/utils'

// ─── State shape ──────────────────────────────────────────────────────────────

interface PagesState {
    pages: Page[]
    isLoading: boolean
    error: string | null
}

// ─── Actions shape ────────────────────────────────────────────────────────────

interface PagesActions {
    setPages: (pages: Page[]) => void
    addPages: (pages: Page[]) => void
    removePage: (id: string) => void
    removePages: (ids: string[]) => void
    updatePage: (id: string, updates: Partial<Page>) => void
    reorderPages: (fromIndex: number, toIndex: number) => void
    rotatePage: (id: string, rotation: PageRotation) => void
    rotatePages: (ids: string[], rotation: PageRotation) => void
    duplicatePage: (id: string) => Page | null
    duplicatePages: (ids: string[]) => Page[]
    setPageMargin: (id: string, margin: PageMargin, custom?: CustomMargin) => void
    setPageImageFit: (id: string, fit: ImageFit) => void
    setThumbnail: (id: string, thumbnailBlob: Blob, thumbnailUrl: string) => void
    setImageUrl: (id: string, imageUrl: string) => void
    setOcrText: (id: string, text: string) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    clearPages: () => void
}

type PagesStore = PagesState & PagesActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePagesStore = create<PagesStore>()(
    subscribeWithSelector((set, get) => ({
        // ── Initial state ──────────────────────────────────────────────────────────
        pages: [],
        isLoading: false,
        error: null,

        // ── Actions ────────────────────────────────────────────────────────────────

        setPages: (pages) => set({ pages: pages.map((p, i) => ({ ...p, isCover: i === 0 })) }),

        addPages: (newPages) =>
            set((state) => {
                const combined = [...state.pages, ...newPages]
                // Always keep the first page as cover
                return {
                    pages: combined.map((p, i) => ({
                        ...p,
                        isCover: i === 0,
                    })),
                }
            }),

        removePage: (id) =>
            set((state) => ({
                pages: state.pages
                    .filter((p) => p.id !== id)
                    .map((p, i) => ({ ...p, order: i })),
            })),

        removePages: (ids) => {
            const idSet = new Set(ids)
            set((state) => ({
                pages: state.pages
                    .filter((p) => !idSet.has(p.id))
                    .map((p, i) => ({ ...p, order: i, isCover: i === 0 })),
            }))
        },

        updatePage: (id, updates) =>
            set((state) => ({
                pages: state.pages.map((p) =>
                    p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
                ),
            })),

        reorderPages: (fromIndex, toIndex) =>
            set((state) => ({
                pages: reorderArray(state.pages, fromIndex, toIndex).map((p, i) => ({
                    ...p,
                    order: i,
                    isCover: i === 0,
                })),
            })),

        rotatePage: (id, rotation) =>
            set((state) => ({
                pages: state.pages.map((p) =>
                    p.id === id
                        ? { ...p, rotation, updatedAt: Date.now() }
                        : p
                ),
            })),

        rotatePages: (ids, rotation) => {
            const idSet = new Set(ids)
            set((state) => ({
                pages: state.pages.map((p) =>
                    idSet.has(p.id)
                        ? { ...p, rotation, updatedAt: Date.now() }
                        : p
                ),
            }))
        },

        duplicatePage: (id) => {
            const { pages } = get()
            const page = pages.find((p) => p.id === id)
            if (!page) return null

            const pageIndex = pages.findIndex((p) => p.id === id)
            const duplicate: Page = {
                ...page,
                id: generateId(),
                order: pageIndex + 1,
                isCover: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }

            set((state) => {
                const newPages = [...state.pages]
                newPages.splice(pageIndex + 1, 0, duplicate)
                return {
                    pages: newPages.map((p, i) => ({ ...p, order: i })),
                }
            })

            return duplicate
        },

        duplicatePages: (ids) => {
            const { pages } = get()
            const duplicates: Page[] = []

            ids.forEach((id) => {
                const page = pages.find((p) => p.id === id)
                if (!page) return

                duplicates.push({
                    ...page,
                    id: generateId(),
                    isCover: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                })
            })

            set((state) => ({
                pages: [...state.pages, ...duplicates].map((p, i) => ({
                    ...p,
                    order: i,
                })),
            }))

            return duplicates
        },

        setPageMargin: (id, margin, custom) =>
            set((state) => ({
                pages: state.pages.map((p) =>
                    p.id === id
                        ? {
                            ...p,
                            margin,
                            customMargin: custom ?? p.customMargin,
                            updatedAt: Date.now(),
                        }
                        : p
                ),
            })),

        setPageImageFit: (id, imageFit) =>
            set((state) => ({
                pages: state.pages.map((p) =>
                    p.id === id ? { ...p, imageFit, updatedAt: Date.now() } : p
                ),
            })),

        setThumbnail: (id, thumbnailBlob, thumbnailUrl) =>
            set((state) => ({
                pages: state.pages.map((p) =>
                    p.id === id ? { ...p, thumbnailBlob, thumbnailUrl } : p
                ),
            })),

        setImageUrl: (id, imageUrl) =>
            set((state) => ({
                pages: state.pages.map((p) =>
                    p.id === id ? { ...p, imageUrl } : p
                ),
            })),

        setOcrText: (id, ocrText) =>
            set((state) => ({
                pages: state.pages.map((p) =>
                    p.id === id
                        ? { ...p, ocrText, ocrStatus: 'done', updatedAt: Date.now() }
                        : p
                ),
            })),

        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        clearPages: () => set({ pages: [] }),
    }))
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectPageById = (id: string) => (state: PagesStore) =>
    state.pages.find((p) => p.id === id)

export const selectPageCount = (state: PagesStore) => state.pages.length

export const selectCoverPage = (state: PagesStore) =>
    state.pages.find((p) => p.isCover)

// Pages are kept in order inside the store — this selector is a stable identity
export const selectSortedPages = (state: PagesStore) => state.pages