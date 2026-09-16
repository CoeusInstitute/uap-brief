export const dynamic = "force-dynamic";

import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";
import ScoreChip from "@/components/ScoreChip";
import { loadMethodology } from "@/lib/stories";
import { TAG_COPY } from "@/lib/tags";
import { SCORE_TAGS } from "@/lib/types";

const MIX = [
  { tag: "VETTED", formula: "0.40·model + 0.30·evidence_chain + 0.20·corroboration + 0.10·official_record" },
  { tag: "CREDIBLE", formula: "0.40·model + 0.25·evidence_chain + 0.20·corroboration + 0.15·official_record" },
  { tag: "PSYOP", formula: "0.45·model + 0.25·narrative_coordination + 0.20·language_markers + 0.10·rehash" },
  { tag: "WOO", formula: "0.50·model + 0.30·language_markers + 0.20·evidence_gap" },
  { tag: "INTERESTING", formula: "0.50·model + 0.30·novelty + 0.20·evidence_chain" },
  { tag: "LACKING_DATA", formula: "0.50·model + 0.50·evidence_gap" },
] as const;

export default async function MethodologyPage() {
  const versions = await loadMethodology();
  const active = versions.find((row) => row.status === "active") ?? versions[0] ?? null;

  return (
    <PageFrame
      layout="main-aside"
      header={
        <PageHeader title="Method">
          <p>
            Scores apply to the story, not the person. A score without stored rationale, components,
            and versions is invalid. Language reads “assessed as”, never “proven”.
          </p>
        </PageHeader>
      }
      aside={
        <section className="g-card" data-edge="rail" data-hover="none" aria-labelledby="adr-status">
          <header className="g-card__header">
            <h2 className="g-heading" id="adr-status">
              Active version
            </h2>
          </header>
          <div className="g-card__body">
            <p className="g-body">
              <span className="g-mono">{active?.version || "unknown"}</span>
              {active?.status ? (
                <>
                  {" "}
                  · <span className="g-mono">{active.status}</span>
                </>
              ) : null}
            </p>
            {active?.notes ? <p className="g-caption">{active.notes}</p> : null}
            <p className="g-caption">
              Review before publish when PSYOP ≥ 7, WOO ≥ 8, VETTED ≥ 7, or CREDIBLE ≥ 7.
              The feed pairs one caution tag with one substance tag. Novelty and rehash are not
              yet computed; novelty is stored as 10 minus rehash.
            </p>
          </div>
        </section>
      }
    >
      <section className="g-card" data-hover="none" aria-labelledby="tag-set-title">
        <header className="g-card__header">
          <div>
            <h2 className="g-heading" id="tag-set-title">
              Tag set
            </h2>
            <p className="g-caption">
              Intensity is 0 to 10 in half-point steps. Caution: PSYOP, WOO, LACKING_DATA. Substance:
              VETTED, CREDIBLE, INTERESTING.
            </p>
          </div>
        </header>
        <div className="g-card__body">
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Meaning</th>
                  <th>Intensity</th>
                </tr>
              </thead>
              <tbody>
                {SCORE_TAGS.map((tag) => (
                  <tr key={tag}>
                    <td>
                      <ScoreChip tag={tag} />
                    </td>
                    <td>{TAG_COPY[tag]}</td>
                    <td className="g-meta">0–10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="g-card" data-hover="none" aria-labelledby="hybrid-title">
        <header className="g-card__header">
          <h2 className="g-heading" id="hybrid-title">
            Hybrid mix
          </h2>
        </header>
        <div className="g-card__body">
          <p className="g-body">
            Model pass plus deterministic components. Extra tags (
            <span className="g-mono">DEBUNKED</span>, <span className="g-mono">SENSATIONAL</span>,{" "}
            <span className="g-mono">UNSUPPORTED</span>) need a new ADR.
          </p>
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Formula</th>
                </tr>
              </thead>
              <tbody>
                {MIX.map((row) => (
                  <tr key={row.tag}>
                    <td className="g-mono">{row.tag}</td>
                    <td className="g-meta">{row.formula}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
