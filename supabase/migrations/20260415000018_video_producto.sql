-- URL de video para productos y servicios
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS url_video TEXT;
