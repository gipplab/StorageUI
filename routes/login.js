var express = require('express');
var router = express.Router();
var sha256 = require('sha256');

var loginHelper = require(__dirname + '/helpers/loginRegisterHelper');


/* GET home page. */
// router.get('/', function(req, res, next) {
//     res.render('login', { title: 'Express', login: true}); //content
// });

router.get('/', function (req, res, next) {
    // console.log(req.session.redirect)
    if (req.session.loggedin === true && req.session.redirect) {
        res.redirect(req.session.redirect)
        req.session.redirect = false;
        return
    } else if (req.session.loggedin === true) {
        res.redirect('/modify')
    } else {
        res.render('login', {loggedin: req.session.loggedin, login: true, errors: req.session.loginErrs}); //content
        req.session.loginErrs = null;
    }
});

router.get('/logout', function (req, res, next) {
    req.session.destroy();
    res.redirect('/')
});

router.post('/submit', async function (req, res, next) {
    try {
        // console.log('sha256 login')
        console.log(await sha256(req.body.username))
        var errs = await loginHelper.checkLoginSubmit(req, await sha256(req.body.username), await sha256(req.body.password));
        if (errs) {
            req.session.loginErrs = errs;
            res.redirect('/login');
        } else {
            req.session.loggedin = true;
            req.session.userSha = await sha256(req.body.username);
            res.redirect('/login');
        }
    } catch (e) {
        console.error(e)
    }

});

module.exports = router;