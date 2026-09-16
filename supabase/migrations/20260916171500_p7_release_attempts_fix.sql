-- P7 fix: released-not-reached claims must not count as attempts.
-- Context: claim_enrichment_batch increments attempts on every claim; rows claimed but not reached
-- within the time budget were released to pending _with_ the increment, so after 3 unused claims a row
-- left the claimable set (attempts < 3) while still pending -- permanently stuck. This patch makes the
-- released_time_budget release balance the increment, so attempts only accumulate on genuine processing attempts.
create or replace function public.complete_enrichment_item(
  p_queue_id uuid,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('pending', 'done', 'failed') then
    raise exception 'invalid enrichment status %', p_status;
  end if;

  update public.enrichment_queue
  set
    status = p_status,
    attempts = case
      when p_status = 'pending' and p_error = 'released_time_budget'
        then greatest(attempts - 1, 0)
      else attempts
    end,
    last_error = case when p_status = 'failed' then p_error else null end,
    locked_at = null,
    updated_at = now()
  where queue_id = p_queue_id;
end;
$$;
