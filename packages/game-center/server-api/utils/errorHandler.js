// Handles unexpected server errors and sends a standardized error response
const handleError = (res, err, defaultMessage, statusCode = 500) => {
    console.error(`${defaultMessage}:`, err.message, err.stack);
    res.status(statusCode).json({ success: false, message: `${defaultMessage}: ${err.message}` });
};
const handleUnauthorized = (res, message = "Unauthorized: No user ID found!") => {
    res.status(401).json({ success: false, message });
};

const handleNotFound = (res, message = "Resource not found!") => {
    res.status(404).json({ success: false, message });
};

const handleBadRequest = (res, message = "Invalid request!") => {
    res.status(400).json({ success: false, message });
};

module.exports = {
    handleError,
    handleUnauthorized,
    handleNotFound,
    handleBadRequest,
};