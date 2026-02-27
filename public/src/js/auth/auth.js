// This file manages authentication features, including login, registration, and session management with Supabase Auth.

import { supabase } from '../services/supabaseClient.js';

export const signUp = async (email, password) => {
    const { user, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { user, error };
};

export const signIn = async (email, password) => {
    const { user, error } = await supabase.auth.signIn({
        email,
        password,
    });
    return { user, error };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getUser = () => {
    return supabase.auth.user();
};

export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
};