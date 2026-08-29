import { create } from 'zustand'
import type { Project, ProjectMetadata } from '@/types'

// ─── State & Actions ──────────────────────────────────────────────────────────

interface ProjectState {
    currentProject: Project | null
    recentProjects: Project[]
    isDirty: boolean
    isSaving: boolean
    lastSavedAt: number | null
}

interface ProjectActions {
    setCurrentProject: (project: Project | null) => void
    updateProject: (updates: Partial<Project>) => void
    updateMetadata: (metadata: Partial<ProjectMetadata>) => void
    setRecentProjects: (projects: Project[]) => void
    addRecentProject: (project: Project) => void
    removeRecentProject: (id: string) => void
    setDirty: (dirty: boolean) => void
    setIsSaving: (saving: boolean) => void
    markSaved: () => void
}

type ProjectStore = ProjectState & ProjectActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectStore>()((set) => ({
    // ── Initial state ──────────────────────────────────────────────────────────
    currentProject: null,
    recentProjects: [],
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,

    // ── Actions ────────────────────────────────────────────────────────────────

    setCurrentProject: (currentProject) =>
        set({ currentProject, isDirty: false }),

    updateProject: (updates) =>
        set((state) => ({
            currentProject: state.currentProject
                ? { ...state.currentProject, ...updates, updatedAt: Date.now() }
                : null,
            isDirty: true,
        })),

    updateMetadata: (metadata) =>
        set((state) => ({
            currentProject: state.currentProject
                ? {
                    ...state.currentProject,
                    metadata: { ...state.currentProject.metadata, ...metadata },
                    updatedAt: Date.now(),
                }
                : null,
            isDirty: true,
        })),

    setRecentProjects: (recentProjects) => set({ recentProjects }),

    addRecentProject: (project) =>
        set((state) => {
            const filtered = state.recentProjects.filter((p) => p.id !== project.id)
            return {
                recentProjects: [project, ...filtered].slice(0, 10),
            }
        }),

    removeRecentProject: (id) =>
        set((state) => ({
            recentProjects: state.recentProjects.filter((p) => p.id !== id),
        })),

    setDirty: (isDirty) => set({ isDirty }),

    setIsSaving: (isSaving) => set({ isSaving }),

    markSaved: () =>
        set({
            isDirty: false,
            isSaving: false,
            lastSavedAt: Date.now(),
        }),
}))

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectProjectName = (state: ProjectStore) =>
    state.currentProject?.name ?? 'Untitled Project'

export const selectHasProject = (state: ProjectStore) =>
    state.currentProject !== null