import type {Job} from "@/lib/types/types";

type JobStatus = Job["jobStatus"];

type JobStatusBadgeProps = {
    status: JobStatus;
    count?: number;
    suffix?: string;
}

const STATUS_STYLES: Record<JobStatus, {background: string; dot: string}> = {
    Saved: {background: "bg-gray-300/50", dot: "bg-gray-500"},
    Applied: {background: "bg-blue-300/50", dot: "bg-blue-500"},
    Interviewing: {background: "bg-red-200/50", dot: "bg-red-400"},
    Offer: {background: "bg-purple-300/50", dot: "bg-purple-500"},
    Accepted: {background: "bg-green-300/50", dot: "bg-green-500"},
    Rejected: {background: "bg-red-300/50", dot: "bg-red-500"},
};

export default function JobStatusBadge({status, count, suffix}: JobStatusBadgeProps) {
    const styles = STATUS_STYLES[status];

    return (
        <div className={`${styles.background} inline-flex max-w-full items-center justify-center gap-x-2 rounded-full px-3 py-1`}>
            <span aria-hidden="true" className={`${styles.dot} size-1.5 shrink-0 rounded-full`}/>
            <span className="truncate text-xs font-semibold text-black/60">
                {status}{suffix ? ` ${suffix}` : ""}
            </span>
            {count !== undefined ? (
                <span className="text-xs font-semibold tabular-nums text-black/50">{count}</span>
            ) : null}
        </div>
    );
}
