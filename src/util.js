module.exports.getStartOfDate = function(date) {
    const original = new Date(date);
    return new Date(original.getFullYear(), original.getMonth(), original.getDate());
}

module.exports.timezone = 'Europe/Brussels';
