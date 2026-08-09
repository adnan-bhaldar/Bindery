import { db } from '@/db/schema'
import { generateId, formatRelativeTime } from '@/lib/utils'
import type { Project, Page } from '@/types'
import { STORAGE_KEYS } from '@/constants'

// ─── Project service ──────────────────────────────────────────────────────────

class ProjectService {
    // ── Create ──────────────────────────────────────────────────────────────────

    async createProject(name = 'Untitled Project'): Promise<Project> {
        const project: Project = {
            id: generateId(),
            name,
            status: 'new',
            pageCount: 0,
            metadata: {
                title: '',
                author: '',
                subject: '',
                keywords: '',
                creator: 'Bindery',
                producer: 'Bindery PDF Engine',
                copyright: '',
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastOpenedAt: Date.now(),
        }

        await db.projects.add(project)
        localStorage.setItem(STORAGE_KEYS.LAST_PROJECT_ID, project.id)
        return project
    }

    // Registers a project that was constructed elsewhere (e.g. useImport's
    // ensureProject, which creates a project object in local state the moment
    // the user drops in their first images, before any explicit "New Project"
    // action). Without this, such projects aren't written to IndexedDB or
    // tracked as the active project until the first autosave tick — so a
    // refresh shortly after import would find nothing to recover.
    async persistProject(project: Project): Promise<void> {
        await db.projects.put(project)
        localStorage.setItem(STORAGE_KEYS.LAST_PROJECT_ID, project.id)
    }

    // ── Save ────────────────────────────────────────────────────────────────────

    async saveProject(project: Project, pages: Page[]): Promise<void> {
        const now = Date.now()
        const updated: Project = { ...project, pageCount: pages.length, updatedAt: now, status: 'saved' }

        await db.transaction('rw', [db.projects, db.pages, db.thumbnails], async () => {
            // Upsert project
            await db.projects.put(updated)

            // Delete old pages for this project
            const existingIds = await db.pages
                .where('projectId').equals(project.id)
                .primaryKeys()
            await db.pages.bulkDelete(existingIds as string[])

            // Save new pages (without blob data for index — blobs stored separately)
            await db.pages.bulkPut(pages.map(p => ({ ...p, projectId: project.id })))

            // Update thumbnails
            const thumbEntries = pages
                .filter(p => p.thumbnailBlob)
                .map(p => ({ pageId: p.id, blob: p.thumbnailBlob!, updatedAt: now }))
            if (thumbEntries.length > 0) {
                await db.thumbnails.bulkPut(thumbEntries)
            }
        })

        localStorage.setItem(STORAGE_KEYS.LAST_PROJECT_ID, project.id)
    }

    // ── Load ────────────────────────────────────────────────────────────────────

    async loadProject(projectId: string): Promise<{ project: Project; pages: Page[] } | null> {
        const project = await db.projects.get(projectId)
        if (!project) return null

        const pages = await db.pages
            .where('projectId').equals(projectId)
            .sortBy('order')

        // Restore thumbnail URLs
        const thumbMap = new Map<string, Blob>()
        const thumbRecords = await db.thumbnails
            .where('pageId').anyOf(pages.map(p => p.id))
            .toArray()
        thumbRecords.forEach(t => thumbMap.set(t.pageId, t.blob))

        const hydratedPages = pages.map(p => ({
            ...p,
            thumbnailBlob: thumbMap.get(p.id),
            thumbnailUrl: thumbMap.has(p.id)
                ? URL.createObjectURL(thumbMap.get(p.id)!)
                : undefined,
        }))

        // Update lastOpenedAt
        await db.projects.update(projectId, { lastOpenedAt: Date.now() })
        localStorage.setItem(STORAGE_KEYS.LAST_PROJECT_ID, projectId)

        return { project: { ...project, lastOpenedAt: Date.now() }, pages: hydratedPages }
    }

    // ── Delete ──────────────────────────────────────────────────────────────────

    async deleteProject(projectId: string): Promise<void> {
        const pageIds = await db.pages
            .where('projectId').equals(projectId)
            .primaryKeys()

        await db.transaction(
            'rw',
            [db.projects, db.pages, db.thumbnails, db.recovery, db.exports],
            async () => {
                await db.projects.delete(projectId)
                await db.pages.bulkDelete(pageIds as string[])
                await db.thumbnails.where('pageId').anyOf(pageIds as string[]).delete()
                // Recovery snapshots and export-history records both carry
                // a projectId but were previously never cleaned up here —
                // they'd silently keep accumulating in IndexedDB forever,
                // even for a project the user explicitly deleted.
                await db.recovery.where('projectId').equals(projectId).delete()
                await db.exports.where('projectId').equals(projectId).delete()
            }
        )

        const lastId = localStorage.getItem(STORAGE_KEYS.LAST_PROJECT_ID)
        if (lastId === projectId) {
            localStorage.removeItem(STORAGE_KEYS.LAST_PROJECT_ID)
        }
    }

    // ── Bulk delete (keep one) ──────────────────────────────────────────────────

    // Used by the storage-full warning: wipes every project's data except
    // the one currently open, so freeing up space doesn't cost the user
    // their in-progress work. Reuses deleteProject per-project so each one
    // gets the exact same cleanup (pages, thumbnails, recovery snapshots,
    // export records) — nothing here duplicates that logic.
    async deleteAllProjectsExcept(keepProjectId: string): Promise<number> {
        const all = await db.projects.toArray()
        const toDelete = all.filter(p => p.id !== keepProjectId)
        for (const project of toDelete) {
            await this.deleteProject(project.id)
        }
        return toDelete.length
    }

    // ── Recent projects ─────────────────────────────────────────────────────────

    async getProject(projectId: string): Promise<Project | null> {
        const project = await db.projects.get(projectId)
        return project ?? null
    }

    async getRecentProjects(limit = 10, keepId?: string): Promise<Project[]> {
        const all = await db.projects
            .orderBy('lastOpenedAt')
            .reverse()
            .toArray()

        // Empty projects are almost always abandoned — created (explicitly,
        // or implicitly via dragging in files that were then removed) but
        // never actually used. Don't let them accumulate in the recents
        // list forever. The currently active project is exempt even if it
        // has 0 pages, since that's just a brand-new project the user is
        // about to start filling in.
        const empties = all.filter(p => p.pageCount === 0 && p.id !== keepId)
        if (empties.length > 0) {
            await db.projects.bulkDelete(empties.map(p => p.id))
        }

        return all
            .filter(p => p.pageCount > 0 || p.id === keepId)
            .slice(0, limit)
    }

    // ── Restore last session ────────────────────────────────────────────────────

    async getLastProjectId(): Promise<string | null> {
        return localStorage.getItem(STORAGE_KEYS.LAST_PROJECT_ID)
    }

    // ── Recovery snapshot ───────────────────────────────────────────────────────

    async saveRecoverySnapshot(
        projectId: string,
        pageCount: number,
        maxSnapshots = 10
    ): Promise<void> {
        const snapshot = {
            id: generateId(),
            projectId,
            timestamp: Date.now(),
            pageCount,
            description: `Auto-saved at ${new Date().toLocaleTimeString()}`,
        }

        await db.recovery.add(snapshot)

        // Prune old snapshots
        const all = await db.recovery
            .where('projectId').equals(projectId)
            .sortBy('timestamp')

        if (all.length > maxSnapshots) {
            const toDelete = all.slice(0, all.length - maxSnapshots)
            await db.recovery.bulkDelete(toDelete.map(s => s.id))
        }
    }

    async getRecoverySnapshots(projectId: string) {
        return db.recovery
            .where('projectId').equals(projectId)
            .reverse()
            .sortBy('timestamp')
    }

}

export const projectService = new ProjectService()

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatProjectDate(project: Project): string {
    return formatRelativeTime(project.lastOpenedAt)
}