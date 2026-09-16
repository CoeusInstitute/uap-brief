import {
  assessmentPercent,
  formatAssessmentScore,
  markerTone,
  tagLabel,
  type AssessmentPair,
} from "@/lib/assessment";

export default function AssessmentLine({ pair }: { pair: AssessmentPair }) {
  const percent = assessmentPercent(pair.caution.score, pair.substance.score);
  const tone = markerTone(pair.caution.score, pair.substance.score);
  const caution = `${tagLabel(pair.caution.tag)} ${formatAssessmentScore(pair.caution.score)}`;
  const substance = `${tagLabel(pair.substance.tag)} ${formatAssessmentScore(pair.substance.score)}`;

  return (
    <div className="assessment-line">
      <span className="assessment-line__label g-mono" data-pole="caution">
        {caution}
      </span>
      <div
        className="assessment-line__track"
        role="img"
        aria-label={`${caution} paired with ${substance}`}
      >
        <div className="assessment-line__hairline" />
        <div className="assessment-line__wash" data-pole="caution" />
        <div className="assessment-line__wash" data-pole="substance" />
        <div className="assessment-line__tick" />
        <div className="assessment-line__marker" data-tone={tone} style={{ left: `${percent}%` }} />
      </div>
      <span className="assessment-line__label g-mono" data-pole="substance">
        {substance}
      </span>
    </div>
  );
}
