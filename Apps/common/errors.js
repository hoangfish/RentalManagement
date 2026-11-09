class AppError extends Error {
    // `errors` (optional) = { fieldName: message } so the client can mark the right input
    constructor(status, message, errors) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        if (errors) this.errors = errors;
    }
}

module.exports = { AppError };
