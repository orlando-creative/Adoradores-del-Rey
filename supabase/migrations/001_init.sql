-- Create the profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(255),
    rol VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the songs table
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(255),
    tono_original VARCHAR(50),
    tipo VARCHAR(50),
    youtube_url TEXT,
    letra_acordes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the repertoires table
CREATE TABLE IF NOT EXISTS repertoires (
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
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the repertoire_songs junction table
CREATE TABLE IF NOT EXISTS repertoire_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repertoire_id UUID REFERENCES repertoires(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    orden INTEGER,
    section VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);