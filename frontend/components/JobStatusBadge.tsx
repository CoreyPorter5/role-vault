import type {Job} from "@/lib/types/types";

type JobStatus = Job["jobStatus"];

type JobStatusBadgeProps = {
    status: JobStatus;
    count?: number;
    suffix?: string;
}

const STATUS_STYLES: Record<JobStatus, {background: string; dot: string}> = {
    Saved: {background: "bg-[#eceae5]", dot: "bg-[#77736b]"},
    Applied: {background: "bg-[#dceafb]", dot: "bg-[#0D3880]"},
    Interviewing: {background: "bg-[#f6e7a9]", dot: "bg-[#9b7700]"},
    Offer: {background: "bg-[#e8e0f5]", dot: "bg-[#6d43a8]"},
    Accepted: {background: "bg-[#dcefe3]", dot: "bg-[#2f7a48]"},
    Rejected: {background: "bg-[#f4dedb]", dot: "bg-[#a7473d]"},
};

export default function JobStatusBadge({status, count, suffix}: JobStatusBadgeProps) {
    const styles = STATUS_STYLES[status];

    return (
        <div className={`${styles.background} inline-flex max-w-full items-center justify-center gap-x-2 rounded-md px-2.5 py-1`}>
            <span aria-hidden="true" className={`${styles.dot} size-1.5 shrink-0 rounded-full`}/>
            <span className="truncate text-xs font-semibold text-[#4f545c]">
                {status}{suffix ? ` ${suffix}` : ""}
            </span>
            {count !== undefined ? (
                <span className="text-xs font-semibold tabular-nums text-[#777c84]">{count}</span>
            ) : null}
        </div>
    );
}
