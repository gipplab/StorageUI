var express = require('express');
var router = express.Router();

const IPFS = require('ipfs');
const OrbitDB = require('orbit-db');


var templater = require('json-templater/object');
var sha256 = require('sha256');

var loginHelper = require(__dirname + '/helpers/loginRegisterHelper');


/* GET home page. */
router.get('/', function (req, res, next) {
    if (req.session.loggedin === true) {
        res.redirect('/')
    } else {
        console.log(req.session.regErrs)
        res.render('register', {loggedin: req.session.loggedin, register: true, errors: req.session.regErrs}); //content
        req.session.regErrs = null;
    }
});

router.post('/submit', async function (req, res, next) {
    try {
        var errs = await loginHelper.checkRegisterSubmit(req, sha256(req.body.username),
            sha256(req.body.password), sha256(req.body.passwordrep))
        console.log(errs)
        if (errs) {
            req.session.regErrs = errs;
            res.redirect('/register');
        } else {
            await loginHelper.userToDb(req, sha256(req.body.username), sha256(req.body.password))
            req.session.loggedin = true;
            req.session.userSha = sha256(req.body.username)
            res.redirect('/add/article');
        }
    } catch (e) {
        console.error(e)
    }
});

module.exports = router;