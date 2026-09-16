import Link from "next/link";
import PageFrame from "@/components/PageFrame";
import PageHeader from "@/components/PageHeader";

export default function NotFound() {
  return (
    <PageFrame
      header={
        <PageHeader title="Not found">
          <p>That path is not in the feed.</p>
        </PageHeader>
      }
    >
      <Link href="/" className="g-button g-button--primary">
        Back to the feed
      </Link>
    </PageFrame>
  );
}
