const { supabase } = require('../services/supabaseClient');

// Function to handle user registration
async function registerUser(email, password) {
    const { user, error } = await supabase.auth.signUp({
        email,
        password,
    });
    if (error) {
        console.error('Registration error:', error.message);
        return null;
    }
    return user;
}

// Function to handle user login
async function loginUser(email, password) {
    const { user, error } = await supabase.auth.signIn({
        email,
        password,
    });
    if (error) {
        console.error('Login error:', error.message);
        return null;
    }
    return user;
}

// Function to handle user logout
async function logoutUser() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Logout error:', error.message);
    }
}

// Function to check user session
async function checkUserSession() {
    const user = supabase.auth.user();
    return user;
}

// Function to display authentication UI
function displayAuthUI() {
    const authContainer = document.getElementById('auth-container');
    authContainer.innerHTML = `
        <h2>Login</h2>
        <form id="login-form">
            <input type="email" id="login-email" placeholder="Email" required />
            <input type="password" id="login-password" placeholder="Password" required />
            <button type="submit">Login</button>
        </form>
        <h2>Register</h2>
        <form id="register-form">
            <input type="email" id="register-email" placeholder="Email" required />
            <input type="password" id="register-password" placeholder="Password" required />
            <button type="submit">Register</button>
        </form>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await loginUser(email, password);
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        await registerUser(email, password);
    });
}

// Export functions for use in other modules
export { registerUser, loginUser, logoutUser, checkUserSession, displayAuthUI };