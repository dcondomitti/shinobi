module.exports = function(process){
    process.send = process.send || function () {};
    process.on('uncaughtException', function (err) {
        console.error('Uncaught Exception occured!');
        console.error(err.stack);
    });
    // [CTRL] + [C] = exit
    process.on('SIGINT', function() {
        console.log('Shinobi is Exiting...')
        process.exit();
    });
}
