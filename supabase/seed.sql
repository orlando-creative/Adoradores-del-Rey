-- Seed data for testing (note: adjust UUIDs and foreign key references to match actual auth users)

-- Sample songs
INSERT INTO songs (titulo, autor, tono_original, tipo, youtube_url, letra_acordes, created_by) VALUES
  ('Cuando allá se pase lista', 'Himnario', 'Do', 'himno', '', '[C]Cuando allá se pase lista\n[G]De los redimidos mil', NULL),
  ('Cristo la roca', 'Himnario', 'Re', 'himno', '', '[D]Cristo la roca, Cristo la roca\n[A]En quien seguro seré', NULL),
  ('Jehova Jireh', 'Alabanza', 'Sol', 'adoracion', '', '[G]Jehova Jireh es mi proveedor\n[D]Mi Dios suplirá', NULL),
  ('Celebrad a Cristo', 'Alabanza', 'Mi', 'adoracion', '', '[E]Celebrad a Cristo, el Rey de Reyes\n[B]Glorificad su nombre', NULL),
  ('Tu eres Rey', 'Alabanza', 'La', 'adoracion', '', '[A]Tu eres Rey, Tu eres Señor\n[E]Todopoderoso Dios', NULL);

-- Sample profiles (create these after users are registered in auth)
-- These would be auto-created by the trigger when users register
-- INSERT INTO profiles (id, nombre, rol) VALUES
--   ('user-uuid-1', 'J. Abraham Segales', 'admin'),
--   ('user-uuid-2', 'Eulalia Andrade', 'user'),
--   ('user-uuid-3', 'Liz Segales', 'user'),
--   ('user-uuid-4', 'Victor Carrasco', 'user'),
--   ('user-uuid-5', 'Leonel Mendieta', 'user');
