-- O endpoint público de imagens pode responder em WebP; preserve o bucket privado
-- e o limite de 10 MiB, aceitando esse formato junto aos já suportados.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp'
]::text[]
where id = 'decidlyai-artifacts';
