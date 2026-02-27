-- Drop existing tables in correct order (due to foreign key constraints)
DROP TABLE IF EXISTS repertoire_songs CASCADE;
DROP TABLE IF EXISTS repertoires CASCADE;
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create the profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(255),
    rol VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the songs table
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(255),
    tono_original VARCHAR(50),
    tipo VARCHAR(50),
    youtube_url TEXT,
    letra_acordes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the repertoires table
CREATE TABLE repertoires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    fecha DATE,
    hora TIME,
    director VARCHAR(255),
    uniforme VARCHAR(255),
    coristas VARCHAR(255),
    teclado VARCHAR(255),
    guitarra VARCHAR(255),
    bateria VARCHAR(255),
    bajo VARCHAR(255),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the repertoire_songs junction table
CREATE TABLE repertoire_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repertoire_id UUID REFERENCES repertoires(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    orden INTEGER,
    section VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, rol)
  VALUES (new.id, new.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
