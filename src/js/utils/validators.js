const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const validatePassword = (password) => {
    return password.length >= 6; // Minimum password length
};

const validateRequiredField = (value) => {
    return value.trim() !== '';
};

const validateSongTitle = (title) => {
    return title.length > 0 && title.length <= 100; // Title should not be empty and should be less than 100 characters
};

const validateRepertoireName = (name) => {
    return name.length > 0 && name.length <= 100; // Name should not be empty and should be less than 100 characters
};

export {
    validateEmail,
    validatePassword,
    validateRequiredField,
    validateSongTitle,
    validateRepertoireName
};