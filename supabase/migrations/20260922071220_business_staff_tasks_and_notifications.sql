-- Business staff, tasks, notifications and staff money.
-- Mirrors live migrations business_staff_tasks_and_notifications + hardening.

create table if not exists business_staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(trim(name))>0),
  email text,
  phone text,
  title text,
  salary_amount numeric(14,2) not null default 0 check (salary_amount>=0),
  salary_period text not null default 'monthly' check (salary_period in ('monthly','weekly','daily')),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists business_staff_business_email_uq on business_staff(business_id,lower(email)) where email is not null;
create index if not exists business_staff_business_idx on business_staff(business_id);
create index if not exists business_staff_user_idx on business_staff(user_id) where user_id is not null;

create table if not exists business_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null check (char_length(trim(title))>0),
  description text,
  category text not null default 'General',
  priority text not null default 'normal' check (priority in ('urgent','high','normal','low')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  assignee_partner_id uuid references business_partners(id) on delete set null,
  assignee_staff_id uuid references business_staff(id) on delete set null,
  due_at timestamptz,
  status_note text,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (assignee_partner_id is not null and assignee_staff_id is not null))
);
create index if not exists business_tasks_business_idx on business_tasks(business_id,created_at desc);
create index if not exists business_tasks_staff_idx on business_tasks(assignee_staff_id,status);
create index if not exists business_tasks_partner_idx on business_tasks(assignee_partner_id,status);
create index if not exists business_tasks_due_idx on business_tasks(business_id,due_at) where due_at is not null;

create table if not exists business_task_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  task_id uuid not null references business_tasks(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  note text not null check (char_length(trim(note))>0),
  status_snapshot text check (status_snapshot is null or status_snapshot in ('pending','in_progress','completed')),
  created_at timestamptz not null default now()
);
create index if not exists business_task_notes_task_idx on business_task_notes(task_id,created_at desc);

create table if not exists business_staff_money (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  staff_id uuid not null references business_staff(id) on delete cascade,
  kind text not null check (kind in ('advance','advance_expense','pocket_expense','reimbursement','salary','advance_return')),
  amount numeric(14,2) not null check (amount>0),
  account_id uuid references business_accounts(id) on delete set null,
  category_id uuid references business_categories(id) on delete set null,
  counterparty text,
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists business_staff_money_staff_idx on business_staff_money(staff_id,occurred_at desc);

create table if not exists business_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  task_id uuid references business_tasks(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  target_partner_id uuid references business_partners(id) on delete cascade,
  target_staff_id uuid references business_staff(id) on delete cascade,
  kind text not null default 'task_update' check (kind in ('task_assigned','task_update','task_reminder','task_completed','staff_money')),
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (((target_partner_id is not null) and (target_staff_id is null)) or ((target_partner_id is null) and (target_staff_id is not null)))
);
create index if not exists business_notifications_partner_idx on business_notifications(target_partner_id,read_at,created_at desc);
create index if not exists business_notifications_staff_idx on business_notifications(target_staff_id,read_at,created_at desc);

create or replace function private.business_staff_id(target_business uuid)
returns uuid language sql stable security definer set search_path=public,pg_temp as $$
  select s.id from business_staff s
  where s.business_id=target_business and s.user_id=auth.uid() and s.active limit 1
$$;
create or replace function private.can_manage_business_team(target_business uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(private.business_role(target_business) in ('admin','partner'),false)
$$;
create or replace function private.current_business_partner_id(target_business uuid)
returns uuid language sql stable security definer set search_path=public,pg_temp as $$
  select bm.partner_id from business_memberships bm
  where bm.business_id=target_business and bm.user_id=auth.uid() and bm.status='active' limit 1
$$;
create or replace function private.can_view_business_task(target_task uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(
    select 1 from business_tasks t where t.id=target_task and (
      private.can_manage_business_team(t.business_id)
      or t.assignee_staff_id=private.business_staff_id(t.business_id)
    )
  )
$$;

alter table business_staff enable row level security;
alter table business_tasks enable row level security;
alter table business_task_notes enable row level security;
alter table business_staff_money enable row level security;
alter table business_notifications enable row level security;

drop policy if exists business_staff_select on business_staff;
create policy business_staff_select on business_staff for select using (
  private.can_manage_business_team(business_id) or id=private.business_staff_id(business_id)
);
drop policy if exists business_tasks_select on business_tasks;
create policy business_tasks_select on business_tasks for select using (
  private.can_manage_business_team(business_id) or assignee_staff_id=private.business_staff_id(business_id)
);
drop policy if exists business_task_notes_select on business_task_notes;
create policy business_task_notes_select on business_task_notes for select using (private.can_view_business_task(task_id));
drop policy if exists business_staff_money_select on business_staff_money;
create policy business_staff_money_select on business_staff_money for select using (
  private.can_manage_business_team(business_id) or staff_id=private.business_staff_id(business_id)
);
drop policy if exists business_notifications_select on business_notifications;
create policy business_notifications_select on business_notifications for select using (
  target_partner_id=private.current_business_partner_id(business_id)
  or target_staff_id=private.business_staff_id(business_id)
);

create or replace function claim_business_staff_memberships()
returns table(membership_id uuid,business_id uuid,business_name text,role text,staff_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare current_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select lower(email) into current_email from auth.users where id=auth.uid();
  if current_email is null then raise exception 'email_required'; end if;
  update business_staff s set user_id=auth.uid(),updated_at=now()
  from businesses b
  where s.business_id=b.id and b.archived_at is null and s.user_id is null and s.active and lower(s.email)=current_email;
  return query
  select s.id,s.business_id,b.name,'staff'::text,s.id
  from business_staff s join businesses b on b.id=s.business_id
  where s.user_id=auth.uid() and s.active and b.archived_at is null order by b.name;
end $$;

create or replace function get_business_staff_expense_categories(target_business uuid)
returns table(id uuid,name text,kind text)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if private.business_staff_id(target_business) is null and not private.can_manage_business_team(target_business) then raise exception 'not_allowed'; end if;
  return query select c.id,c.name,c.kind from business_categories c
  where c.business_id=target_business and c.active and c.kind in ('expense','both') order by c.name;
end $$;

create or replace function get_business_staff_positions(target_business uuid)
returns table(staff_id uuid,name text,title text,salary_amount numeric,salary_period text,advance_received numeric,advance_spent numeric,advance_returned numeric,advance_balance numeric,pocket_expenses numeric,reimbursements numeric,outstanding_due numeric,salary_paid numeric)
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor_staff uuid;
begin
  actor_staff:=private.business_staff_id(target_business);
  if not private.can_manage_business_team(target_business) and actor_staff is null then raise exception 'not_allowed'; end if;
  return query
  select s.id,s.name,s.title,s.salary_amount,s.salary_period,
    coalesce(sum(m.amount) filter(where m.kind='advance'),0)::numeric,
    coalesce(sum(m.amount) filter(where m.kind='advance_expense'),0)::numeric,
    coalesce(sum(m.amount) filter(where m.kind='advance_return'),0)::numeric,
    (coalesce(sum(m.amount) filter(where m.kind='advance'),0)-coalesce(sum(m.amount) filter(where m.kind='advance_expense'),0)-coalesce(sum(m.amount) filter(where m.kind='advance_return'),0))::numeric,
    coalesce(sum(m.amount) filter(where m.kind='pocket_expense'),0)::numeric,
    coalesce(sum(m.amount) filter(where m.kind='reimbursement'),0)::numeric,
    (coalesce(sum(m.amount) filter(where m.kind='pocket_expense'),0)-coalesce(sum(m.amount) filter(where m.kind='reimbursement'),0))::numeric,
    coalesce(sum(m.amount) filter(where m.kind='salary'),0)::numeric
  from business_staff s left join business_staff_money m on m.staff_id=s.id and m.business_id=s.business_id
  where s.business_id=target_business and s.active and (private.can_manage_business_team(target_business) or s.id=actor_staff)
  group by s.id,s.name,s.title,s.salary_amount,s.salary_period,s.created_at order by s.created_at;
end $$;

create or replace function add_business_staff(target_business uuid,staff_name text,staff_email text default null,staff_phone text default null,staff_title text default null,staff_salary numeric default 0,staff_salary_period text default 'monthly')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_staff uuid; normalized_email text; existing_user uuid;
begin
  if not private.can_manage_business_team(target_business) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(staff_name,'')))<1 then raise exception 'staff_name_required'; end if;
  if coalesce(staff_salary,0)<0 then raise exception 'invalid_salary'; end if;
  if staff_salary_period not in ('monthly','weekly','daily') then raise exception 'invalid_salary_period'; end if;
  normalized_email:=nullif(lower(trim(coalesce(staff_email,''))),'');
  if normalized_email is not null then select id into existing_user from auth.users where lower(email)=normalized_email limit 1; end if;
  insert into business_staff(business_id,user_id,name,email,phone,title,salary_amount,salary_period,created_by)
  values(target_business,existing_user,trim(staff_name),normalized_email,nullif(trim(coalesce(staff_phone,'')),''),nullif(trim(coalesce(staff_title,'')),''),round(coalesce(staff_salary,0),2),staff_salary_period,auth.uid())
  returning id into new_staff;
  return new_staff;
end $$;

create or replace function update_business_staff(target_staff uuid,staff_name text,staff_email text default null,staff_phone text default null,staff_title text default null,staff_salary numeric default 0,staff_salary_period text default 'monthly',staff_active boolean default true)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s business_staff%rowtype; normalized_email text; existing_user uuid;
begin
  select * into s from business_staff where id=target_staff for update;
  if s.id is null then raise exception 'staff_not_found'; end if;
  if not private.can_manage_business_team(s.business_id) then raise exception 'not_allowed'; end if;
  normalized_email:=nullif(lower(trim(coalesce(staff_email,''))),'');
  if normalized_email is not null then select id into existing_user from auth.users where lower(email)=normalized_email limit 1; end if;
  update business_staff set name=trim(staff_name),email=normalized_email,user_id=existing_user,
    phone=nullif(trim(coalesce(staff_phone,'')),''),title=nullif(trim(coalesce(staff_title,'')),''),
    salary_amount=round(coalesce(staff_salary,0),2),salary_period=staff_salary_period,active=staff_active,updated_at=now()
  where id=target_staff;
end $$;

create or replace function hard_delete_business_staff(target_staff uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s business_staff%rowtype;
begin
  select * into s from business_staff where id=target_staff;
  if s.id is null then raise exception 'staff_not_found'; end if;
  if not private.can_manage_business_team(s.business_id) then raise exception 'not_allowed'; end if;
  delete from business_staff where id=target_staff;
end $$;

create or replace function create_business_task(target_business uuid,target_title text,target_description text default null,target_category text default 'General',target_priority text default 'normal',target_assignee_partner uuid default null,target_assignee_staff uuid default null,target_due_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_task uuid;
begin
  if not private.can_manage_business_team(target_business) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_title,'')))<1 then raise exception 'task_title_required'; end if;
  if target_priority not in ('urgent','high','normal','low') then raise exception 'invalid_priority'; end if;
  if target_assignee_partner is not null and target_assignee_staff is not null then raise exception 'one_assignee_only'; end if;
  insert into business_tasks(business_id,title,description,category,priority,assignee_partner_id,assignee_staff_id,due_at,created_by)
  values(target_business,trim(target_title),nullif(trim(coalesce(target_description,'')),''),coalesce(nullif(trim(coalesce(target_category,'')),''),'General'),target_priority,target_assignee_partner,target_assignee_staff,target_due_at,auth.uid())
  returning id into new_task;
  if target_assignee_partner is not null then
    insert into business_notifications(business_id,task_id,sender_user_id,target_partner_id,kind,title,body)
    values(target_business,new_task,auth.uid(),target_assignee_partner,'task_assigned','New task assigned',trim(target_title));
  elsif target_assignee_staff is not null then
    insert into business_notifications(business_id,task_id,sender_user_id,target_staff_id,kind,title,body)
    values(target_business,new_task,auth.uid(),target_assignee_staff,'task_assigned','New task assigned',trim(target_title));
  end if;
  return new_task;
end $$;

create or replace function update_business_task(target_task uuid,target_title text,target_description text default null,target_category text default 'General',target_priority text default 'normal',target_assignee_partner uuid default null,target_assignee_staff uuid default null,target_due_at timestamptz default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t business_tasks%rowtype; changed boolean;
begin
  select * into t from business_tasks where id=target_task for update;
  if t.id is null then raise exception 'task_not_found'; end if;
  if not private.can_manage_business_team(t.business_id) then raise exception 'not_allowed'; end if;
  changed:=t.assignee_partner_id is distinct from target_assignee_partner or t.assignee_staff_id is distinct from target_assignee_staff;
  update business_tasks set title=trim(target_title),description=nullif(trim(coalesce(target_description,'')),''),
    category=coalesce(nullif(trim(coalesce(target_category,'')),''),'General'),priority=target_priority,
    assignee_partner_id=target_assignee_partner,assignee_staff_id=target_assignee_staff,due_at=target_due_at,updated_at=now()
  where id=target_task;
  if changed and target_assignee_partner is not null then
    insert into business_notifications(business_id,task_id,sender_user_id,target_partner_id,kind,title,body)
    values(t.business_id,t.id,auth.uid(),target_assignee_partner,'task_assigned','Task assigned to you',trim(target_title));
  elsif changed and target_assignee_staff is not null then
    insert into business_notifications(business_id,task_id,sender_user_id,target_staff_id,kind,title,body)
    values(t.business_id,t.id,auth.uid(),target_assignee_staff,'task_assigned','Task assigned to you',trim(target_title));
  end if;
end $$;

create or replace function set_business_task_status(target_task uuid,target_status text,target_note text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t business_tasks%rowtype; actor_staff uuid; clean_note text;
begin
  select * into t from business_tasks where id=target_task for update;
  if t.id is null then raise exception 'task_not_found'; end if;
  actor_staff:=private.business_staff_id(t.business_id);
  if not private.can_manage_business_team(t.business_id) and not(actor_staff is not null and t.assignee_staff_id=actor_staff) then raise exception 'not_allowed'; end if;
  if target_status not in ('pending','in_progress','completed') then raise exception 'invalid_status'; end if;
  clean_note:=nullif(trim(coalesce(target_note,'')),'');
  if target_status='completed' and clean_note is null then raise exception 'completion_note_required'; end if;
  if target_status='pending' and t.status<>'pending' and clean_note is null then raise exception 'pending_note_required'; end if;
  update business_tasks set status=target_status,status_note=clean_note,completed_at=case when target_status='completed' then now() else null end,updated_at=now() where id=t.id;
  if clean_note is not null then insert into business_task_notes(business_id,task_id,author_user_id,note,status_snapshot) values(t.business_id,t.id,auth.uid(),clean_note,target_status); end if;
end $$;

create or replace function add_business_task_note(target_task uuid,target_note text,notify_other boolean default true)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t business_tasks%rowtype; clean_note text;
begin
  select * into t from business_tasks where id=target_task;
  if t.id is null or not private.can_view_business_task(target_task) then raise exception 'not_allowed'; end if;
  clean_note:=nullif(trim(coalesce(target_note,'')),''); if clean_note is null then raise exception 'note_required'; end if;
  insert into business_task_notes(business_id,task_id,author_user_id,note,status_snapshot) values(t.business_id,t.id,auth.uid(),clean_note,t.status);
  if notify_other and t.assignee_staff_id is not null and private.business_staff_id(t.business_id) is distinct from t.assignee_staff_id then
    insert into business_notifications(business_id,task_id,sender_user_id,target_staff_id,kind,title,body)
    values(t.business_id,t.id,auth.uid(),t.assignee_staff_id,'task_update','New task note',t.title||' · '||clean_note);
  end if;
end $$;

create or replace function send_business_task_reminder(target_task uuid,target_message text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t business_tasks%rowtype; body_text text;
begin
  select * into t from business_tasks where id=target_task;
  if t.id is null or not private.can_manage_business_team(t.business_id) then raise exception 'not_allowed'; end if;
  body_text:=coalesce(nullif(trim(coalesce(target_message,'')),''),t.title);
  if t.assignee_staff_id is not null then
    insert into business_notifications(business_id,task_id,sender_user_id,target_staff_id,kind,title,body)
    values(t.business_id,t.id,auth.uid(),t.assignee_staff_id,'task_reminder','Task reminder',body_text);
  elsif t.assignee_partner_id is not null then
    insert into business_notifications(business_id,task_id,sender_user_id,target_partner_id,kind,title,body)
    values(t.business_id,t.id,auth.uid(),t.assignee_partner_id,'task_reminder','Task reminder',body_text);
  else raise exception 'no_recipient'; end if;
end $$;

create or replace function hard_delete_business_task(target_task uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t business_tasks%rowtype;
begin
  select * into t from business_tasks where id=target_task;
  if t.id is null or not private.can_manage_business_team(t.business_id) then raise exception 'not_allowed'; end if;
  delete from business_tasks where id=target_task;
end $$;

create or replace function record_business_staff_money(target_business uuid,target_staff uuid,target_kind text,target_amount numeric,target_account uuid default null,target_category uuid default null,target_counterparty text default null,target_note text default null,target_occurred_at timestamptz default now())
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_entry uuid; actor_staff uuid; advance_balance numeric:=0; due_balance numeric:=0;
begin
  actor_staff:=private.business_staff_id(target_business);
  if not private.can_manage_business_team(target_business) and not(actor_staff=target_staff and target_kind in ('advance_expense','pocket_expense')) then raise exception 'not_allowed'; end if;
  if target_kind not in ('advance','advance_expense','pocket_expense','reimbursement','salary','advance_return') then raise exception 'invalid_kind'; end if;
  if target_amount is null or target_amount<=0 then raise exception 'invalid_amount'; end if;
  if target_kind in ('advance','reimbursement','salary','advance_return') then
    if target_account is null then raise exception 'account_required'; end if;
  else target_account:=null; end if;
  if target_kind in ('advance_expense','advance_return') then
    select coalesce(sum(amount) filter(where kind='advance'),0)-coalesce(sum(amount) filter(where kind='advance_expense'),0)-coalesce(sum(amount) filter(where kind='advance_return'),0)
    into advance_balance from business_staff_money where business_id=target_business and staff_id=target_staff;
    if advance_balance<target_amount then raise exception 'amount_exceeds_staff_advance_balance'; end if;
  end if;
  if target_kind='reimbursement' then
    select coalesce(sum(amount) filter(where kind='pocket_expense'),0)-coalesce(sum(amount) filter(where kind='reimbursement'),0)
    into due_balance from business_staff_money where business_id=target_business and staff_id=target_staff;
    if due_balance<target_amount then raise exception 'reimbursement_exceeds_staff_due'; end if;
  end if;
  insert into business_staff_money(business_id,staff_id,kind,amount,account_id,category_id,counterparty,note,occurred_at,created_by)
  values(target_business,target_staff,target_kind,round(target_amount,2),target_account,target_category,nullif(trim(coalesce(target_counterparty,'')),''),nullif(trim(coalesce(target_note,'')),''),coalesce(target_occurred_at,now()),auth.uid())
  returning id into new_entry;
  return new_entry;
end $$;

create or replace function hard_delete_business_staff_money(target_entry uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e business_staff_money%rowtype; actor_staff uuid;
begin
  select * into e from business_staff_money where id=target_entry;
  if e.id is null then raise exception 'entry_not_found'; end if;
  actor_staff:=private.business_staff_id(e.business_id);
  if not private.can_manage_business_team(e.business_id) and not(actor_staff=e.staff_id and e.created_by=auth.uid() and e.kind in ('advance_expense','pocket_expense')) then raise exception 'not_allowed'; end if;
  delete from business_staff_money where id=target_entry;
end $$;

create or replace function mark_business_notification_read(target_notification uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update business_notifications n set read_at=coalesce(n.read_at,now())
  where n.id=target_notification and (
    n.target_partner_id=private.current_business_partner_id(n.business_id)
    or n.target_staff_id=private.business_staff_id(n.business_id)
  );
end $$;
create or replace function mark_all_business_notifications_read(target_business uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor_staff uuid; actor_partner uuid;
begin
  actor_staff:=private.business_staff_id(target_business); actor_partner:=private.current_business_partner_id(target_business);
  if actor_staff is null and actor_partner is null then raise exception 'not_allowed'; end if;
  update business_notifications n set read_at=coalesce(n.read_at,now())
  where n.business_id=target_business and ((actor_staff is not null and n.target_staff_id=actor_staff) or (actor_partner is not null and n.target_partner_id=actor_partner));
end $$;

create or replace function get_business_account_balances(target_business uuid)
returns table(account_id uuid,name text,kind text,balance numeric)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not private.is_business_member(target_business) then raise exception 'not_allowed'; end if;
  return query
  select a.id,a.name,a.kind,round(a.opening_balance+coalesce(le.delta,0)+coalesce(sm.delta,0),2)
  from business_accounts a
  left join (
    select account_id,sum(amount) delta from business_ledger_entries
    where business_id=target_business and bucket='account' group by account_id
  ) le on le.account_id=a.id
  left join (
    select account_id,sum(case when kind in ('advance','reimbursement','salary') then -amount when kind='advance_return' then amount else 0 end) delta
    from business_staff_money where business_id=target_business and account_id is not null group by account_id
  ) sm on sm.account_id=a.id
  where a.business_id=target_business and a.active
  order by case a.kind when 'cash' then 1 when 'bank' then 2 when 'upi' then 3 else 4 end,a.name;
end $$;

revoke execute on function claim_business_staff_memberships() from public,anon;
revoke execute on function get_business_staff_expense_categories(uuid) from public,anon;
revoke execute on function get_business_staff_positions(uuid) from public,anon;
revoke execute on function add_business_staff(uuid,text,text,text,text,numeric,text) from public,anon;
revoke execute on function update_business_staff(uuid,text,text,text,text,numeric,text,boolean) from public,anon;
revoke execute on function hard_delete_business_staff(uuid) from public,anon;
revoke execute on function create_business_task(uuid,text,text,text,text,uuid,uuid,timestamptz) from public,anon;
revoke execute on function update_business_task(uuid,text,text,text,text,uuid,uuid,timestamptz) from public,anon;
revoke execute on function set_business_task_status(uuid,text,text) from public,anon;
revoke execute on function add_business_task_note(uuid,text,boolean) from public,anon;
revoke execute on function send_business_task_reminder(uuid,text) from public,anon;
revoke execute on function hard_delete_business_task(uuid) from public,anon;
revoke execute on function record_business_staff_money(uuid,uuid,text,numeric,uuid,uuid,text,text,timestamptz) from public,anon;
revoke execute on function hard_delete_business_staff_money(uuid) from public,anon;
revoke execute on function mark_business_notification_read(uuid) from public,anon;
revoke execute on function mark_all_business_notifications_read(uuid) from public,anon;

grant execute on function claim_business_staff_memberships() to authenticated;
grant execute on function get_business_staff_expense_categories(uuid) to authenticated;
grant execute on function get_business_staff_positions(uuid) to authenticated;
grant execute on function add_business_staff(uuid,text,text,text,text,numeric,text) to authenticated;
grant execute on function update_business_staff(uuid,text,text,text,text,numeric,text,boolean) to authenticated;
grant execute on function hard_delete_business_staff(uuid) to authenticated;
grant execute on function create_business_task(uuid,text,text,text,text,uuid,uuid,timestamptz) to authenticated;
grant execute on function update_business_task(uuid,text,text,text,text,uuid,uuid,timestamptz) to authenticated;
grant execute on function set_business_task_status(uuid,text,text) to authenticated;
grant execute on function add_business_task_note(uuid,text,boolean) to authenticated;
grant execute on function send_business_task_reminder(uuid,text) to authenticated;
grant execute on function hard_delete_business_task(uuid) to authenticated;
grant execute on function record_business_staff_money(uuid,uuid,text,numeric,uuid,uuid,text,text,timestamptz) to authenticated;
grant execute on function hard_delete_business_staff_money(uuid) to authenticated;
grant execute on function mark_business_notification_read(uuid) to authenticated;
grant execute on function mark_all_business_notifications_read(uuid) to authenticated;
