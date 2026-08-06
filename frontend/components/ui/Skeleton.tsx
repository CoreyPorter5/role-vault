type SkeletonProps = {
    className?: string;
}

export default function Skeleton({className = ""}: SkeletonProps) {
    return <div aria-hidden="true" className={`motion-safe:animate-pulse rounded-md bg-slate-200 ${className}`}/>;
}
