var express = require('express');
var router = express.Router();
var sha256 = require('sha256')
var multer = require('multer')
var upload = multer({dest: __dirname + '/uploads'});

var loginHelper = require(__dirname + '/helpers/loginRegisterHelper');
var ipfsHelper = require(__dirname + '/helpers/ipfsOriginHelper');
var storageHelper = require(__dirname + '/helpers/storageApiHelper');


/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {loggedin: req.session.loggedin, home: true});
});

/*check sha256 hashed username and password*/
router.post('/checkPassword/', async function (req, res, next) {
    if (typeof req.body.usr == 'undefined') {
        req.body.usr = ""
    }
    if (typeof req.body.pwd == 'undefined') {
        req.body.pwd = ""
    }
    console.log('password: '+ await sha256('testitesti'))
    console.log('bodypw: ' + await sha256(req.body.usr))
    var errors = await loginHelper.checkLoginSubmit(req, await sha256(req.body.usr), await sha256(req.body.pwd))
    res.send({errors: errors})
});

router.post('/register', async function (req, res, next) {
    if (typeof req.body.usr == 'undefined') {
        req.body.usr = ""
    }
    if (typeof req.body.pwd == 'undefined') {
        req.body.pwd = ""
    }
    if (typeof req.body.pwd2 == 'undefined')
        req.body.pwd2 = ""

    var errors = await loginHelper.checkRegisterSubmit(req, sha256(req.body.usr), sha256(req.body.pwd), sha256(req.body.pwd2))
    if(!errors){
        errors = await loginHelper.userToDb(req, sha256(req.body.usr), sha256(req.body.pwd))

    }
    res.send({errors: errors})
})


router.post('/uploadArticle', upload.single('file_contents'), async function (req, res, next) {
    try {
        //check login data
        var errors = [];
        var err
        if (typeof req.body.usr == 'undefined') {
            req.body.usr = ""
        }
        if (typeof req.body.pwd == 'undefined') {
            req.body.pwd = ""
        }
        if (err = await loginHelper.checkLoginSubmit(req, await sha256(req.body.usr), await sha256(req.body.pwd))) {
            res.send({errors: err})
            console.log('err: checkloginsubmit')
            return
        }

        //check if incoming file
        if (typeof req.file == 'undefined') {
            errors.push({msg: "No incoming file!"})
            res.send({errors: errors})
            console.log('err: incoming file')

            return
        }
        req.file.sha = await ipfsHelper.hash256(req.file.path);

        //check metadata for integrity
        if (err = await storageHelper.checkArticleUploadMetadata(req)) {
            res.send({errors: err});
            console.log('err: check metadata')

            return
        }

        //upload to ipfs and cluster and check
        var ipfsHash = await ipfsHelper.addToIPFS(req);
        if (ipfsHash instanceof Error) {
            errors.push({msg: ipfsHash.message})
            console.log('err: upload to ipfs')

            res.send({errors: errors})
            return
        }

        //upload to orbit (need templater and the other stuff.)
        var templater = require('json-templater/object')
        var article = templater(require(__dirname + '/../templates/article.json'),
            {
                "id": req.file.sha,
                "title": req.body.title,
                "abstract": req.body.abstract,
                "tags": req.body.tags,
                "authors": req.body.authors,
                "owner": await sha256(req.body.usr),
                "filesets": [],
                "ipfsAddress": ipfsHash,
                "originalName": req.file.originalname,
                "encoding": req.file.encoding,
                "mimetype": req.file.mimetype,
                "sha256": req.file.sha
            }
        )

        //store filedata to orbit
        err = await storageHelper.writeArticleToOrbit(req, article)
        if (err instanceof Error) {
            console.log('err: toorbit')
            errors.push({msg: err.message})
            res.send({errors: errors})
            return
        }
        // article.errors = false;
        res.send({'article': article, 'errors': false})
        return false


    } catch (err) {
        console.log('modifyArticle error : ' + err)
        res.send({
            errors: {
                msg: 'Something internally went wrong! We try to fix this.',
                err: err.message
            }
        })
        return;
    }

})

router.post('/uploadAdditionalData', upload.single('file_contents'), async function (req, res, next) {
    try {
        //check login data
        var errors = [];
        var err
        if (typeof req.body.usr == 'undefined') {
            req.body.usr = ""
        }
        if (typeof req.body.pwd == 'undefined') {
            req.body.pwd = ""
        }
        if (err = await loginHelper.checkLoginSubmit(req, await sha256(req.body.usr), await sha256(req.body.pwd))) {
            res.send({errors: err})
            console.log('err: checkloginsubmit')
            return
        }

        //check if incoming file
        if (typeof req.file == 'undefined') {
            errors.push({msg: "No incoming file!"})
            res.send({errors: errors})
            console.log('err: incoming file')

            return
        }
        req.file.sha = await ipfsHelper.hash256(req.file.path);

        //check metadata for integrity
        if (err = await storageHelper.checkAdditionalFileUploadMetadata(req)) {
            res.send({errors: err});
            console.log('err: check metadata')

            return
        }

        //upload to ipfs and cluster and check
        var ipfsHash = await ipfsHelper.addToIPFS(req);
        if (ipfsHash instanceof Error) {
            errors.push({msg: ipfsHash.message})
            console.log('err: upload to ipfs')

            res.send({errors: errors})
            return
        }

        //upload to orbit (need templater and the other stuff.)
        var templater = require('json-templater/object')
        var fileset = templater(require(__dirname + '/../templates/fileset.json'),
            {
                "id": req.file.sha,
                "title": req.body.title,
                "abstract": req.body.abstract,
                "tags": req.body.tags,
                "authors": req.body.authors,
                "owner": await sha256(req.body.usr),
                "ipfsAddress": ipfsHash,
                "originalName": req.file.originalname,
                "encoding": req.file.encoding,
                "mimetype": req.file.mimetype,
                "sha256": req.file.sha
            }
        )

        //store filedata to orbit
        err = await storageHelper.writeAdditionalFileToOrbit(req, fileset, req.body.articleSha)
        if (err instanceof Error) {
            console.log('err: toorbit')
            errors.push({msg: err.message})
            res.send({errors: errors})
            return
        }
        // article.errors = false;
        res.send({'file': fileset, 'errors': false})
        return false


    } catch (err) {
        console.log('uploadAdditionalData error : ' + err)
        res.send({
            errors: {
                msg: 'Something internally went wrong! We try to fix this.',
                err: err.message
            }
        })
        return;
    }

})

module.exports = router;