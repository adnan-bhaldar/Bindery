import { memo } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps { className?: string; style?: React.CSSProperties }

export const Skeleton = memo(({ className, style }: SkeletonProps) => (
    <div className={cn('skeleton', className)} style={style} aria-hidden />
))
Skeleton.displayName = 'Skeleton'

export const PageThumbnailSkeleton = memo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
        <Skeleton style={{ width: '100%', aspectRatio: '3/4', borderRadius: 'var(--r-md)' }} />
        <Skeleton style={{ width: 48, height: 10, margin: '0 auto', borderRadius: 'var(--r-sm)' }} />
    </div>
))
PageThumbnailSkeleton.displayName = 'PageThumbnailSkeleton'