-- Songs
create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'IDEE' check (status in ('IDEE','SCHREIBEN','ARRANGEMENT','DEMO','FERTIG','VERÖFFENTLICHT')),
  progress int not null default 0,
  album_id uuid,
  bpm int,
  key text,
  notes text,
  created_at timestamptz default now()
);

-- Albums
create table albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'album' check (type in ('album','ep','single')),
  release_date date,
  created_at timestamptz default now()
);

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'show' check (type in ('show','probe','meeting','deadline','other')),
  date timestamptz not null,
  venue text,
  fee numeric,
  notes text,
  created_at timestamptz default now()
);

-- Event-Setlist (Songs einer Probe/Show)
create table event_songs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  position int not null default 1,
  created_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  done boolean not null default false,
  due_date date,
  priority text not null default 'mittel' check (priority in ('hoch','mittel','niedrig')),
  assigned_to uuid references auth.users(id),
  project_id uuid,
  event_id uuid references events(id),
  created_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'offen' check (status in ('offen','aktiv','abgeschlossen')),
  due_date date,
  notes text,
  created_at timestamptz default now()
);

-- Goals
create table goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year int not null default extract(year from now())::int,
  target_value numeric not null,
  current_value numeric not null default 0,
  unit text,
  created_at timestamptz default now()
);

-- Merch
create table merch_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text,
  gender text,
  color text,
  stock int not null default 0,
  reorder_threshold int not null default 5,
  price numeric,
  created_at timestamptz default now()
);

-- Contacts
create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'other' check (type in ('label','booker','press','producer','other')),
  email text,
  phone text,
  website text,
  notes text,
  created_at timestamptz default now()
);

-- Wiki
create table wiki_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  tags text[] default '{}',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Profiles (gespiegelt aus auth.users, für Anzeigenamen)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Foreign keys
alter table songs add constraint songs_album_id_fkey
  foreign key (album_id) references albums(id) on delete set null;

alter table tasks add constraint tasks_project_id_fkey
  foreign key (project_id) references projects(id) on delete set null;

-- RLS aktivieren
alter table songs enable row level security;
alter table albums enable row level security;
alter table events enable row level security;
alter table event_songs enable row level security;
alter table tasks enable row level security;
alter table projects enable row level security;
alter table goals enable row level security;
alter table merch_items enable row level security;
alter table contacts enable row level security;
alter table wiki_pages enable row level security;
alter table profiles enable row level security;

-- Policies: nur eingeloggte Bandmitglieder haben Zugriff
create policy "auth users full access" on songs       for all using (auth.role() = 'authenticated');
create policy "auth users full access" on albums      for all using (auth.role() = 'authenticated');
create policy "auth users full access" on events      for all using (auth.role() = 'authenticated');
create policy "auth users full access" on event_songs for all using (auth.role() = 'authenticated');
create policy "auth users full access" on tasks       for all using (auth.role() = 'authenticated');
create policy "auth users full access" on projects    for all using (auth.role() = 'authenticated');
create policy "auth users full access" on goals       for all using (auth.role() = 'authenticated');
create policy "auth users full access" on merch_items for all using (auth.role() = 'authenticated');
create policy "auth users full access" on contacts    for all using (auth.role() = 'authenticated');
create policy "auth users full access" on wiki_pages  for all using (auth.role() = 'authenticated');
create policy "auth users full access" on profiles    for all using (auth.role() = 'authenticated');

-- Trigger: profiles automatisch befüllen wenn neuer User angelegt wird
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
