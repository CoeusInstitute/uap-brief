import type { FeedQuery } from "@/lib/feed";

export default function FeedFilter({ query }: { query: FeedQuery }) {
  return (
    <div className="feed-filter" aria-label="Feed filters">
      <div className="feed-filter__inner">
        <form className="feed-filter__search" action="/" method="get" role="search">
          <label className="sr-only" htmlFor="feed-search">
            Search the feed
          </label>
          <input
            id="feed-search"
            className="g-field"
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Search stories"
            key={query.q}
          />
        </form>
      </div>
    </div>
  );
}
