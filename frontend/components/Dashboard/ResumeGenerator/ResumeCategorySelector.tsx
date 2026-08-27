"use client";

import Image from "next/image";
import {Check} from "lucide-react";
import Skeleton from "../../ui/Skeleton";
import {
    resumeCategoryDefinitions,
    type ResumeCategory,
} from "@/lib/resume-generation/categories";

type ResumeCategorySelectorProps = {
    selectedCategory: ResumeCategory | null;
    suggestedCategory: ResumeCategory | null;
    loading: boolean;
    saving: boolean;
    onSelect: (category: ResumeCategory) => void;
};

export default function ResumeCategorySelector({
    selectedCategory,
    suggestedCategory,
    loading,
    saving,
    onSelect,
}: ResumeCategorySelectorProps) {
    return (
        <section aria-labelledby="resume-category-heading" className="space-y-3">
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <h3 id="resume-category-heading" className="text-sm font-bold text-slate-950">
                        Choose the job type
                    </h3>
                    {saving && <span className="text-xs font-medium text-blue-700">Saving selection...</span>}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                    This controls the writing strategy, sections and resume format. You can override our suggestion.
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Array.from({length: resumeCategoryDefinitions.length}, (_, index) => (
                        <div key={index} className="rounded-lg border border-slate-200 bg-white p-2">
                            <Skeleton className="h-28 w-full"/>
                            <Skeleton className="mt-2 h-4 w-4/5"/>
                            <Skeleton className="mt-1 h-3 w-full"/>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {resumeCategoryDefinitions.map((definition) => {
                        const selected = selectedCategory === definition.key;
                        const suggested = suggestedCategory === definition.key;

                        return (
                            <button
                                key={definition.key}
                                type="button"
                                aria-pressed={selected}
                                disabled={saving}
                                onClick={() => onSelect(definition.key)}
                                className={`group relative rounded-lg border p-2 text-left transition disabled:cursor-wait disabled:opacity-70 ${
                                    selected
                                        ? "border-blue-600 bg-blue-50 shadow-sm ring-2 ring-blue-100 hover:bg-blue-100/70"
                                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                                }`}
                            >
                                <div className="relative h-28 overflow-hidden rounded border border-slate-200 bg-slate-100">
                                    <Image
                                        src={definition.previewPath}
                                        alt={`${definition.label} resume format preview`}
                                        fill
                                        sizes="(max-width: 640px) 42vw, 190px"
                                        className="object-contain object-top"
                                    />
                                    {selected && (
                                        <span className="absolute right-2 top-2 rounded-full bg-blue-700 p-1 text-white shadow-sm">
                                            <Check aria-hidden="true" size={14}/>
                                        </span>
                                    )}
                                    {suggested && (
                                        <span className="absolute left-2 top-2 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                            Suggested
                                        </span>
                                    )}
                                </div>
                                <span className="mt-2 block text-xs font-bold leading-4 text-slate-950">
                                    {definition.shortLabel}
                                </span>
                                <span className="mt-1 hidden text-[11px] leading-4 text-slate-600 sm:block">
                                    {definition.description}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
