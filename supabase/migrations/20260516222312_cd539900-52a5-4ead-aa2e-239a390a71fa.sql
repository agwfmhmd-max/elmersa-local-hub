
-- Enums and helper
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users see own roles" on public.user_roles
for select to authenticated using (user_id = auth.uid());

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- Cities
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.cities enable row level security;
create policy "cities readable by all" on public.cities for select using (true);
create policy "anyone can add city" on public.cities for insert with check (true);
create policy "admin manage cities" on public.cities for update using (public.has_role(auth.uid(),'admin'));
create policy "admin delete cities" on public.cities for delete using (public.has_role(auth.uid(),'admin'));

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "categories readable by all" on public.categories for select using (true);
create policy "anyone can add category" on public.categories for insert with check (true);
create policy "admin manage categories" on public.categories for update using (public.has_role(auth.uid(),'admin'));
create policy "admin delete categories" on public.categories for delete using (public.has_role(auth.uid(),'admin'));

-- Ads
create table public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  price numeric not null,
  city_id uuid not null references public.cities(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  whatsapp text not null,
  images text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  featured_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.ads (is_featured desc, created_at desc);
create index on public.ads (city_id);
create index on public.ads (category_id);
create trigger ads_updated_at before update on public.ads
for each row execute function public.set_updated_at();

alter table public.ads enable row level security;
create policy "active ads readable by all" on public.ads for select using (is_active = true or public.has_role(auth.uid(),'admin'));
create policy "anyone can create ad" on public.ads for insert with check (true);
create policy "admin update ads" on public.ads for update using (public.has_role(auth.uid(),'admin'));
create policy "admin delete ads" on public.ads for delete using (public.has_role(auth.uid(),'admin'));

-- Payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  amount numeric not null,
  method text not null,
  proof_url text not null,
  status text not null default 'pending', -- pending | approved | rejected
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;
create policy "anyone can create payment" on public.payments for insert with check (true);
create policy "admin read payments" on public.payments for select using (public.has_role(auth.uid(),'admin'));
create policy "admin update payments" on public.payments for update using (public.has_role(auth.uid(),'admin'));
create policy "admin delete payments" on public.payments for delete using (public.has_role(auth.uid(),'admin'));

-- Settings (single-row key/value style; use a fixed row)
create table public.settings (
  id int primary key default 1,
  pro_price numeric not null default 1500,
  free_post_enabled boolean not null default true,
  payment_phone text not null default '20479962',
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);
create trigger settings_updated_at before update on public.settings
for each row execute function public.set_updated_at();
insert into public.settings (id) values (1);

alter table public.settings enable row level security;
create policy "settings readable by all" on public.settings for select using (true);
create policy "admin update settings" on public.settings for update using (public.has_role(auth.uid(),'admin'));

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('ads-images', 'ads-images', true),
  ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy "public read ads images" on storage.objects for select using (bucket_id = 'ads-images');
create policy "anyone upload ads images" on storage.objects for insert with check (bucket_id = 'ads-images');
create policy "anyone upload proofs" on storage.objects for insert with check (bucket_id = 'payment-proofs');
create policy "admin read proofs" on storage.objects for select using (bucket_id = 'payment-proofs' and public.has_role(auth.uid(),'admin'));

-- Auto-assign admin role to configured email on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email = 'agwfmhmd@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Seed cities and categories
insert into public.cities (name) values
  ('نواكشوط'), ('نواذيبو'), ('روصو'), ('كيهيدي'), ('كيفة'), ('أطار'), ('زويرات'), ('النعمة'), ('سيلبابي'), ('العيون')
on conflict do nothing;

insert into public.categories (name) values
  ('سيارات'), ('عقارات'), ('هواتف'), ('إلكترونيات'), ('أثاث'), ('ملابس'), ('خدمات'), ('وظائف'), ('حيوانات'), ('أخرى')
on conflict do nothing;
