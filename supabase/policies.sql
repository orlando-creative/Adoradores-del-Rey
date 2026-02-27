-- Policies for Row Level Security (RLS) in the Church Music System

-- Enable Row Level Security for the songs table
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Policy for allowing users to select songs
CREATE POLICY "Select songs" 
ON songs
FOR SELECT
USING (auth.role() = 'admin' OR auth.role() = 'user');

-- Policy for allowing users to insert songs
CREATE POLICY "Insert songs" 
ON songs
FOR INSERT
WITH CHECK (auth.role() = 'admin');

-- Policy for allowing users to update songs
CREATE POLICY "Update songs" 
ON songs
FOR UPDATE
USING (auth.role() = 'admin')
WITH CHECK (auth.role() = 'admin');

-- Policy for allowing users to delete songs
CREATE POLICY "Delete songs" 
ON songs
FOR DELETE
USING (auth.role() = 'admin');

-- Enable Row Level Security for the repertoires table
ALTER TABLE repertoires ENABLE ROW LEVEL SECURITY;

-- Policy for allowing users to select repertoires
CREATE POLICY "Select repertoires" 
ON repertoires
FOR SELECT
USING (auth.role() = 'admin' OR auth.role() = 'user');

-- Policy for allowing users to insert repertoires
CREATE POLICY "Insert repertoires" 
ON repertoires
FOR INSERT
WITH CHECK (auth.role() = 'admin');

-- Policy for allowing users to update repertoires
CREATE POLICY "Update repertoires" 
ON repertoires
FOR UPDATE
USING (auth.role() = 'admin')
WITH CHECK (auth.role() = 'admin');

-- Policy for allowing users to delete repertoires
CREATE POLICY "Delete repertoires" 
ON repertoires
FOR DELETE
USING (auth.role() = 'admin');