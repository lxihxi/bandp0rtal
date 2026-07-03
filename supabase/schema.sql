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

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
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
  variant text,
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

-- Foreign key songs -> albums
alter table songs add constraint songs_album_id_fkey
  foreign key (album_id) references albums(id) on delete set null;

-- Foreign key tasks -> projects
alter table tasks add constraint tasks_project_id_fkey
  foreign key (project_id) references projects(id) on delete set null;

-- RLS: alle authentifizierten User haben vollen Zugriff
alter table songs enable row level security;
alter table albums enable row level security;
alter table events enable row level security;
alter table tasks enable row level security;
alter table projects enable row level security;
alter table goals enable row level security;
alter table merch_items enable row level security;
alter table contacts enable row level security;
alter table wiki_pages enable row level security;

create policy "auth users full access" on songs for all using (auth.role() = 'authenticated');
create policy "auth users full access" on albums for all using (auth.role() = 'authenticated');
create policy "auth users full access" on events for all using (auth.role() = 'authenticated');
create policy "auth users full access" on tasks for all using (auth.role() = 'authenticated');
create policy "auth users full access" on projects for all using (auth.role() = 'authenticated');
create policy "auth users full access" on goals for all using (auth.role() = 'authenticated');
create policy "auth users full access" on merch_items for all using (auth.role() = 'authenticated');
create policy "auth users full access" on contacts for all using (auth.role() = 'authenticated');
create policy "auth users full access" on wiki_pages for all using (auth.role() = 'authenticated');
