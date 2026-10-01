import AssessmentLine from "@/components/AssessmentLine";
import {
  assessmentPercent,
  formatAssessmentScore,
  markerTone,
  tagLabel,
  type AssessmentPair,
} from "@/lib/assessment";

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(10, score));
}

function pairText(pair: AssessmentPair): { caution: string; substance: string; label: string } {
  const caution = `${tagLabel(pair.caution.tag)} ${formatAssessmentScore(pair.caution.score)}`;
  const substance = `${tagLabel(pair.substance.tag)} ${formatAssessmentScore(pair.substance.score)}`;
  return { caution, substance, label: `${caution} paired with ${substance}` };
}

function SegmentBar({ score, pole }: { score: number; pole: "caution" | "substance" }) {
  const filled = Math.round(clampScore(score));
  return (
    <span className="front-readout__bar" aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => (
        <span
          key={index}
          className="front-readout__cell"
          data-pole={pole}
          data-filled={index < filled ? "true" : undefined}
        />
      ))}
    </span>
  );
}

export function ScoreCaption({ pair }: { pair: AssessmentPair | null }) {
  if (!pair) return null;
  const text = pairText(pair);
  return (
    <p className="front-meter-caption g-mono">
      <span data-pole="caution">{text.caution}</span>
      <span aria-hidden="true"> / </span>
      <span data-pole="substance">{text.substance}</span>
    </p>
  );
}

export default function ScoreReadout({
  variant,
  pair,
  part = "strip",
}: {
  variant: "panel" | "meter" | "micro";
  pair: AssessmentPair | null;
  part?: "strip" | "caption";
}) {
  if (!pair) return null;
  const text = pairText(pair);
  const tone = markerTone(pair.caution.score, pair.substance.score);

  if (variant === "micro") {
    return (
      <span className="front-micro" role="img" aria-label={text.label} title={text.label}>
        <span className="front-micro__dot" data-tone={tone} style={{ left: `${assessmentPercent(pair.caution.score, pair.substance.score)}%` }} />
      </span>
    );
  }

  if (variant === "meter") {
    if (part === "caption") return <ScoreCaption pair={pair} />;
    return (
      <span className="front-meter" aria-hidden="true">
        <span className="front-meter__caution" style={{ width: `${clampScore(pair.caution.score) * 5}%` }} />
        <span className="front-meter__substance" style={{ width: `${clampScore(pair.substance.score) * 5}%` }} />
        <span className="front-meter__tick" />
      </span>
    );
  }

  return (
    <div className="front-readout-wrap">
      <div className="front-readout g-mono">
        <span className="front-readout__led" data-tone={tone} aria-hidden="true" />
        <div className="front-readout__row">
          <span>CAUTION</span>
          <span>{tagLabel(pair.caution.tag)}</span>
          <span>{formatAssessmentScore(pair.caution.score)}</span>
          <SegmentBar score={pair.caution.score} pole="caution" />
        </div>
        <div className="front-readout__row">
          <span>SUBSTANCE</span>
          <span>{tagLabel(pair.substance.tag)}</span>
          <span>{formatAssessmentScore(pair.substance.score)}</span>
          <SegmentBar score={pair.substance.score} pole="substance" />
        </div>
      </div>
      <AssessmentLine pair={pair} />
    </div>
  );
}
