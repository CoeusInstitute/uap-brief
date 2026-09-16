import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-chrome site-chrome--footer">
      <div className="site-footer">
        <div>
          <p className="g-heading">UAP Brief</p>
          <p className="g-caption">UAP news. Scores apply to stories, not people.</p>
        </div>
        <nav className="g-stack" aria-label="Footer">
          <Link href="/methodology" className="g-link">
            Methodology
          </Link>
          <Link href="/people" className="g-link">
            People
          </Link>
          <Link href="/events" className="g-link">
            Events
          </Link>
          <Link href="/about" className="g-link">
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
