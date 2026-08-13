import type {ReactNode} from "react";

export default function InlineErrorMessage({
                                               children,
                                               className = "",
                                           }: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <p
            role="alert"
            className={`inline-flex w-fit max-w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-semibold leading-5 ${className}`}
            style={{backgroundColor: "#fff3f0", color: "#9f3f37"}}
        >
            <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full" style={{backgroundColor: "#c45a50"}}/>
            <span>{children}</span>
        </p>
    );
}
