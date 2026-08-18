"use client"

import {LoaderCircle, TriangleAlert, X} from "lucide-react";
import {useEffect, useRef} from "react";

type ConfirmationDialogProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    busy?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function ConfirmationDialog({
                                               open,
                                               title,
                                               description,
                                               confirmLabel,
                                               busy = false,
                                               onCancel,
                                               onConfirm,
                                           }: ConfirmationDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (open && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog?.open) {
            dialog.close();
        }
    }, [open]);

    if (!open) {
        return null;
    }

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="confirmation-dialog-title"
            aria-describedby="confirmation-dialog-description"
            onCancel={(event) => {
                event.preventDefault();
                if (!busy) onCancel();
            }}
            onClick={(event) => {
                if (event.target === dialogRef.current && !busy) onCancel();
            }}
            className="fixed inset-0 z-[70] m-auto max-w-[calc(100%-2rem)] rounded-2xl bg-transparent p-0 backdrop:bg-slate-950/45 backdrop:backdrop-blur-[2px]"
        >
            <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
                <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <TriangleAlert size={20}/>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 id="confirmation-dialog-title" className="text-lg font-bold text-slate-950">{title}</h2>
                        <p id="confirmation-dialog-description" className="mt-1.5 text-sm leading-6 text-slate-600">
                            {description}
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close confirmation"
                        disabled={busy}
                        onClick={onCancel}
                        className="inline-flex size-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    >
                        <X size={18}/>
                    </button>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onCancel}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onConfirm}
                        className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        {busy ? <LoaderCircle className="animate-spin" size={16}/> : null}
                        {busy ? "Deleting…" : confirmLabel}
                    </button>
                </div>
            </section>
        </dialog>
    );
}
