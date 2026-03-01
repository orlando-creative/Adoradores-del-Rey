import { supabase } from './supabaseClient.js';

export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
}

export async function register(email, password, nombre) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { nombre } // Se usará en el trigger para crear el profile
        }
    });
    if (error) throw error;

    // Asegurar que el perfil se guarde en la base de datos manualmente
    if (data.user) {
        await supabase.from('profiles').upsert({
            id: data.user.id,
            nombre: nombre,
            rol: 'user'
        });
    }

    return data;
}

export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = 'login.html';
}

export async function getCurrentProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (error) console.error('Error fetching profile:', error);
    return data;
}