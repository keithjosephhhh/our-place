-- Messages: both members can read/insert-as-self/update (read receipts, reactions, pins); only the sender can delete.
drop policy if exists "messages member all" on messages;
create policy "messages read" on messages for select using (is_member(space_id));
create policy "messages insert as self" on messages for insert with check (is_member(space_id) and sender = auth.uid());
create policy "messages update" on messages for update using (is_member(space_id)) with check (is_member(space_id));
create policy "messages delete own" on messages for delete using (is_member(space_id) and sender = auth.uid());

-- Date nights: remember who started one, so the partner can be invited even while offline.
alter table date_nights add column if not exists started_by uuid default auth.uid() references auth.users(id);
