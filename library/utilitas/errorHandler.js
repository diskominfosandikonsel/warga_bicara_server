
function respondError422(res, next, text) {
    res.status(422);
    const error = new Error(text);
    next(error);
}

module.exports = {
    respondError422:respondError422
}