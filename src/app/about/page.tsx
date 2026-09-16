import Link from "next/link";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";

export default function AboutPage() {
  return (
    <PageFrame
      header={
        <PageHeader title="About">
          <p>
            UAP Brief is a daily UAP news brief with receipts. People and show pages are the bench
            behind the coverage. It does not assert that any extraordinary claim is true.
          </p>
        </PageHeader>
      }
    >
      <div className="prose-block">
        <p className="g-eyebrow">This is</p>
        <p className="g-body">A daily UAP news brief with receipts.</p>
        <p className="g-body">A bench of people and shows behind the coverage.</p>
        <p className="g-body">A place where skeptics and official positions stay first-class.</p>
      </div>
      <div className="prose-block">
        <p className="g-eyebrow">This is not</p>
        <p className="g-body">A rumor feed or a person-labeling dossier.</p>
        <p className="g-body">The Bias Brief. Same stack shape, different scores.</p>
        <p className="g-body">A place that invents scores or headlines.</p>
      </div>
      <div className="g-row">
        <Link href="/methodology" className="g-link">
          Methodology
        </Link>
        <Link href="/people" className="g-link">
          People
        </Link>
      </div>
    </PageFrame>
  );
}
