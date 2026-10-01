"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { getStoryRecord } from "@/app/story/actions";
import { DossierBlock } from "@/components/DossierBlock";
import ScoreReadout from "@/components/front/ScoreReadout";
import ScoreChip from "@/components/ScoreChip";
import { formatStoryDateTime } from "@/lib/feed";
import type { StoryRecordModel } from "@/lib/story-record";

function nextIndex() {
  let n = 0;
  return () => String(++n).padStart(2, "0");
}

export default function StoryDeskRecord({ storyId }: { storyId: string }) {
  const reactId = useId();
  const [model, setModel] = useState<StoryRecordModel | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setModel(null);
    getStoryRecord(storyId)
      .then((data) => {
        if (cancelled) return;
        setModel(data);
        setStatus(data ? "ready" : "missing");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  if (status === "loading") {
    return <p className="dossier-window__empty">Loading record.</p>;
  }
  if (status === "error") {
    return <p className="dossier-window__empty" data-tone="error">Record could not be loaded.</p>;
  }
  if (status === "missing" || !model) {
    return <p className="dossier-window__empty">No record for this id.</p>;
  }

  const seq = nextIndex();
  const date = formatStoryDateTime(model.publishedAt);
  const publisher = model.outlet || "Unknown";

  return (
    <article className="dossier-window" aria-labelledby={`${reactId}-name`}>
      <header className="dossier-window__hero">
        <p className="dossier-window__filemark">{model.formLabel ?? "Story"} file</p>
        <h2 id={`${reactId}-name`} className="dossier-window__name">
          {model.title}
        </h2>
        <dl className="dossier-window__meta">
          <div>
            <dt>Publisher</dt>
            <dd>
              {model.homepageUrl ? (
                <a href={model.homepageUrl} className="g-link" target="_blank" rel="noopener noreferrer">
                  {publisher}
                </a>
              ) : (
                publisher
              )}
            </dd>
          </div>
          {date ? (
            <div>
              <dt>Date</dt>
              <dd>{date}</dd>
            </div>
          ) : null}
          {model.formLabel ? (
            <div>
              <dt>Type</dt>
              <dd>{model.formLabel}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      {model.imageUrl ? (
        <div className="front-window__media">
          <Image src={model.imageUrl} alt="" fill sizes="600px" />
          {model.illustrated ? <span className="front-media__illustration">Illustration</span> : null}
        </div>
      ) : null}

      <DossierBlock index={seq()} title="Brief">
        {model.brief ? <p className="g-caption">{model.brief}</p> : <p className="g-caption">No brief stored.</p>}
      </DossierBlock>

      <DossierBlock index={seq()} title="Assessment">
        <ScoreReadout variant="panel" pair={model.assessment} />
        {model.scores.length === 0 ? (
          <p className="g-caption">No scores stored for this story.</p>
        ) : (
          <div className="g-stack">
            {model.scores.map((item) => (
              <div key={item.tag} className="prose-block">
                <div className="g-row">
                  <ScoreChip tag={item.tag} score={item.score ?? undefined} />
                  {item.confidence ? <span className="g-meta">{item.confidence}</span> : null}
                </div>
                {item.rationale ? <p className="g-caption">{item.rationale}</p> : <p className="g-caption">No rationale stored.</p>}
              </div>
            ))}
          </div>
        )}
      </DossierBlock>

      <DossierBlock index={seq()} title="Source">
        {model.canonicalUrl ? (
          <>
            <a href={model.canonicalUrl} className="g-link" target="_blank" rel="noopener noreferrer">
              Read at {model.outlet || "source"}
            </a>
            <span className="front-window__url">{model.canonicalUrl}</span>
          </>
        ) : (
          <p className="g-caption">No source URL stored.</p>
        )}
      </DossierBlock>

      <p className="dossier-window__disclaimer front-window__disclaimer">Scores apply to the story, not the person.</p>
    </article>
  );
}
