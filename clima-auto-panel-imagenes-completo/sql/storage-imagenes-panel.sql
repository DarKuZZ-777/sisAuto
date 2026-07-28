-- ============================================================
-- CLIMA AUTO - STORAGE PARA TODAS LAS IMÁGENES DEL PANEL
-- Bucket público existente: SIS_AUTO
-- Este script no borra tablas ni registros.
-- ============================================================

-- 1. Columnas internas para conservar el nombre del archivo en Storage.
alter table public.configuracion_negocio
add column if not exists logo_ruta_storage text;

alter table public.configuracion_negocio
add column if not exists portada_ruta_storage text;

alter table public.servicios
add column if not exists ruta_storage text;

alter table public.trabajos
add column if not exists ruta_storage text;

-- 2. Políticas del bucket SIS_AUTO.
drop policy if exists "SIS_AUTO lectura publica" on storage.objects;
drop policy if exists "SIS_AUTO admin inserta" on storage.objects;
drop policy if exists "SIS_AUTO admin actualiza" on storage.objects;
drop policy if exists "SIS_AUTO admin elimina" on storage.objects;

create policy "SIS_AUTO lectura publica"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'SIS_AUTO');

create policy "SIS_AUTO admin inserta"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'SIS_AUTO'
  and exists (
    select 1
    from public.administradores a
    where a.usuario_id = auth.uid()
  )
);

create policy "SIS_AUTO admin actualiza"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'SIS_AUTO'
  and exists (
    select 1
    from public.administradores a
    where a.usuario_id = auth.uid()
  )
)
with check (
  bucket_id = 'SIS_AUTO'
  and exists (
    select 1
    from public.administradores a
    where a.usuario_id = auth.uid()
  )
);

create policy "SIS_AUTO admin elimina"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'SIS_AUTO'
  and exists (
    select 1
    from public.administradores a
    where a.usuario_id = auth.uid()
  )
);

-- 3. Verificación opcional de las columnas creadas.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'configuracion_negocio' and column_name in ('logo_ruta_storage', 'portada_ruta_storage'))
    or (table_name = 'servicios' and column_name = 'ruta_storage')
    or (table_name = 'trabajos' and column_name = 'ruta_storage')
  )
order by table_name, column_name;
