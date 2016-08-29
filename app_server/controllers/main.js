module.exports.index =  function indexAction(req, res, next) {
    res.render('index', { title: 'Express' });
};