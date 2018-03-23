module.exports.formatDate = function(date){
    const newDate = new Date(date);
    return `${newDate.toDateString()} ${newDate.toTimeString()}`;
}

module.exports.timezone = 'Europe/Brussels';
