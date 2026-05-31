create policy "Workspace members can update automation logs"
on public.automation_logs
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
