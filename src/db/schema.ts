import Dexie, { type Table } from 'dexie'
import { DB_NAME, DB_VERSION } from '@/constants'
import type {
    Page,
    Project,
    AppSettings,
    HistoryEntry,
    ExportPreset,
    RecoverySnapshot,
} from '@/types'

// ─── Table row types ──────────────────────────────────────────────────────────

export interface ThumbnailRecord {
    pageId: string
    blob: Blob
    updatedAt: number
}

export interface CacheRecord {
    key: string
    blob: Blob
    size: number
    createdAt: number
    lastAccessedAt: number
}

export interface ExportRecord {
    id: string
    projectId: string
    filename: string
    pageCount: number
    fileSize: number
    exportedAt: number
}

// ─── Database class ───────────────────────────────────────────────────────────

export class BinderyDatabase extends Dexie {
    projects!: Table<Project>
    pages!: Table<Page>
    thumbnails!: Table<ThumbnailRecord>
    settings!: Table<AppSettings & { id: string }>
    history!: Table<HistoryEntry>
    presets!: Table<ExportPreset>
    cache!: Table<CacheRecord>
    recovery!: Table<RecoverySnapshot>
    exports!: Table<ExportRecord>

    constructor() {
        super(DB_NAME)

        this.version(DB_VERSION).stores({
            projects: 'id, name, status, updatedAt, lastOpenedAt',
            pages: 'id, projectId, order, ocrStatus, createdAt',
            thumbnails: 'pageId, updatedAt',
            settings: 'id',
            history: 'id, type, timestamp',
            presets: 'id, name, isBuiltIn',
            cache: 'key, size, createdAt, lastAccessedAt',
            recovery: 'id, projectId, timestamp',
            exports: 'id, projectId, exportedAt',
        })
    }
}

// ─── Singleton instance ───────────────────────────────────────────────────────

export const db = new BinderyDatabase()

// ─── DB version helpers ───────────────────────────────────────────────────────

export async function clearDatabase(): Promise<void> {
    await db.transaction(
        'rw',
        [
            db.projects,
            db.pages,
            db.thumbnails,
            db.settings,
            db.history,
            db.presets,
            db.cache,
            db.recovery,
            db.exports,
        ],
        async () => {
            await Promise.all([
                db.projects.clear(),
                db.pages.clear(),
                db.thumbnails.clear(),
                db.history.clear(),
                db.cache.clear(),
                db.recovery.clear(),
                db.exports.clear(),
            ])
        }
    )
}

export async function getDatabaseSize(): Promise<number> {
    const estimate = await navigator.storage?.estimate()
    return estimate?.usage ?? 0
}