import type { QA } from '@/lib/retentionFaq';

/** <script type="application/ld+json"> (safe against "</script>" in data). */
export function JsonLd({ data }: { data: unknown }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
        />
    );
}

/** Visible Q&A (server-rendered). Collapsed by default so it doesn't crowd the page. */
export function FaqSection({ title, qas, id }: { title: string; qas: QA[]; id?: string }) {
    if (!qas.length) return null;
    return (
        <section id={id} className="mx-auto mt-12 max-w-[1500px] px-4 md:px-8" aria-labelledby={id ? `${id}-title` : undefined}>
            <h2 id={id ? `${id}-title` : undefined} className="font-display text-2xl font-bold uppercase tracking-wide">
                {title}
            </h2>
            <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {qas.map((x) => (
                    <details key={x.q} className="group px-5 py-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold marker:hidden">
                            <h3 className="font-semibold">{x.q}</h3>
                            <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                                +
                            </span>
                        </summary>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{x.a}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}
