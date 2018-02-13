var express = require('express');
var router = express.Router();
var multer = require('multer');
var fs = require('fs');
var crypto = require('crypto');
var request = require('request');

var upload = multer({dest: __dirname + '/uploads'});

/* GET home page. */

/*
* 1. load file
* 2. sha
* 3 originstamp
* 4 load to ipfs
* 5 pin to cluster
* 6 write author -> articledata to orbit
*
* */

/*router.get('/testDatabase', function (req, res, next) {
    testDatabase(req, res);
});*/



//additional data stuff

router.get('/additionaldata', function (req, res, next) {
    if(!req.session.loggedin){req.session.loginErrs = [{msg: 'Please login first!'}]; req.session.redirect="/add/additionaldata"; res.redirect('/login'); return  }
    getArticles(req, res);
});

// router.post('/uploaddata', upload.single('upl'), function (req, res, next) {
//     handleFileUpload(req)
// })

router.post('/uploadadditionaldata', upload.single('upl'), function (req, res, next) {
    handleFileUpload(req).then((err) => {
            if (err) {
                req.session.fileErrors = err;
                res.redirect('/add/additionaldata');
            } else {
                res.redirect('/modify')
                //TODO redirect to ... idk. msg: successfully uploaded stuff.

            }
        }
    )
});

async function getArticles(req, res) {
    orbitdb = req.app.get('orbit');
    db = await orbitdb.docstore('articles_storage_UI', {overwrite: true})
    await db.load()
    var articles = await db.query(e => e.owner == req.session.userSha)  //[0].articles
    // console.log(articles)
    if (articles[0] != null) {
        res.render('addadditionaldata', {
            loggedin: req.session.loggedin,
            add: true,
            addArticles: articles,
            errors: req.session.fileErrors
        }); //content
    } else {
        res.render('addadditionaldata', {
            loggedin: req.session.loggedin,
            add: true,
            addArticles: [],
            errors: req.session.fileErrors
        }); //content
    }
    db.close()

    req.session.fileErrors = null;
}

async function handleFileUpload(req) {
    try {
        if (typeof req.file == 'undefined') {
            return ['No file selected']
        }

        var sha = await hash256(req.file.path);
        // console.log(sha)
        req.file.sha = sha;
        var errs = await new Promise((resolve, reject) => {
            if (res = checkFileData(req)) {
                resolve(res)
            } else {
                reject()
            }
        })
        // console.log('errs: ' + errs)
        if (errs[0] != null) {
            req.session.articleErrors = errs
            console.log('article errors ' + req.session.articleErrors)
            return errs;

        }
        var originstamp = await originUpload(sha);
        // console.log(originstamp)
        var uploadedFile = await writeToIpfs(req) //TODO in handleArticleUpload
        console.log('uploaded file: ' + JSON.stringify(uploadedFile))
        var isPinned = await pinToCluster(uploadedFile.hash)
        console.log('is pinned: ' + isPinned)
        var writeToOrbit = await writeFileToOrbit(req, uploadedFile.hash)
        console.log('orbit: ' + writeToOrbit)
        return false;
    } catch (err) {
        console.log(err)
    }

}

async function writeFileToOrbit(req, ipfsAddress) {
    //create article json
    try {
        var templater = require('json-templater/object')
        var json_art = templater(require(__dirname + '/../templates/fileset.json'),
            {
                "id": req.file.sha,
                "title": req.body.title,
                "abstract": req.body.dataAbstract,
                "tags": req.body.dataTags,
                "authors": req.body.dataAuthors,
                "owner": req.session.userSha,
                "ipfsAddress": ipfsAddress,
                "originalName": req.file.originalname,
                "encoding": req.file.encoding,
                "mimetype": req.file.mimetype,
                "sha256": req.file.sha
            }
        )
        // console.log(json_art)
        const orbitdb = req.app.get('orbit')
        db = await orbitdb.docstore('files_storage_UI', {overwrite: true})//,
        await db.load()
        // console.log('titleresult')
        var titleResult = await db.query(e=>e.title == req.body.title)
        // console.log(titleResult);
        if (titleResult[0] == null) { //TODO articleUPload
            await db.put(json_art)
            await db.close()

            //add fileset to user
            db = await orbitdb.docstore('users_storage_UI', {overwrite: true})
            await db.load()

            var user = await db.get(req.session.userSha)
            // console.log('user ' + user)
            if (user[0] == null) {
                user[0] = templater(require(__dirname + '/../templates/user_w_alldata.json'),
                    {
                        "id_hash": req.session.userSha
                    })
            }

            user[0].filesets.push(req.file.sha)
            var error = await db.put(user[0])
            // console.log(error);
            // console.log('get: ' + JSON.stringify(await db.get('testitesti')))
            await db.close()

            //add to article
            if (req.body.dataPaper != 'none') {
                db = await orbitdb.docstore('articles_storage_UI', {overwrite: true})//,
                await db.load()
                var paper = db.query(e=>e.title==req.body.dataPaper)
                // console.log('paper');
                // console.log(paper)
                if (paper[0] != null) {
                    var upl = paper[0].filesets.push(json_art._id);
                    // console.log('paper32');
                    // console.log(paper[0])
                    await db.put(paper[0])
                }
                await db.close()
            }
        }
    } catch (err) {
        console.log('Error in add.js:writeToFile: ' + err)
    }


}

async function checkFileData(req) {

    var errs = []
    const orbitdb = req.app.get('orbit');
    db = await orbitdb.docstore('files_storage_UI', {overwrite: true})//,
    await db.load()
    var res = await db.query((e) => e._id == req.body.title);
    if (res[0] != null) {
        errs.push("Title " + req.body.title + " already exists!")
    }
    res = await db.query((e) => e.metadata.sha256 == req.file.sha);
    if (res[0] != null) {
        errs.push("Hash error: File exists already!")
    }
    await db.close()
    return errs;
}


//Article data

router.get('/article', function (req, res, next) {
    if(!req.session.loggedin){req.session.loginErrs = [{msg: 'Please login first!'}]; req.session.redirect="/add/article"; res.redirect('/login'); return  }

    // console.log(req.session.articleErrors)
    res.render('add', {loggedin: req.session.loggedin, add: true, errors: req.session.articleErrors}); //content
    req.session.articleErrors = null;
});

router.post('/uploadarticle', upload.single('upl'), function (req, res, next) {
    handleArticleUpload(req).then((err) => {
            if (err) {
                req.session.articleErrors = err;
                res.redirect('/add/article');
            } else {
                res.redirect('/modify')
                //TODO redirect to ... idk. msg: successfully uploaded stuff.

            }
        }
    )
    /*// console.log('last '+errs);
    // handleArticleUpload(req)



    // console.log(req.body); //form fields
    /!* example output:
    { title: 'abc' }

     *!/
    // console.log(req.file); //form files
    /!* example output:
            { fieldname: 'upl',
              originalname: 'grumpy.png',
              encoding: '7bit',
              mimetype: 'image/png',
              destination: './uploads/',
              filename: '436ec561793aa4dc475a88e84776b1b9',
              path: 'uploads/436ec561793aa4dc475a88e84776b1b9',
              size: 277056 }
     *!/
    // res.status(204).end();*/
});

async function handleArticleUpload(req) {
    const orbit = req.app.get('orbit');
    const ipfs = req.app.get('ipfs');
    try {
        if (typeof req.file == 'undefined') {
            return ['No file selected!']
        }
        var sha = await hash256(req.file.path);
        // console.log(sha)
        req.file.sha = sha;
        var errs = await new Promise((resolve, reject) => {
            if (res = checkArticleData(req)) {
                resolve(res)
            } else {
                reject()
            }
        })
        if (errs[0] != null) {
            req.session.articleErrors = errs
            console.log('article errors ' + req.session.articleErrors)
            return errs;
        }
        var originstamp = await originUpload(sha);
        console.log('originstamp: '+originstamp)
        var uploadedFile = await writeToIpfs(req)
        console.log('uploaded file: ' + uploadedFile)
        var isPinned = await pinToCluster(uploadedFile.hash)
        console.log('is pinned: ' + isPinned)
        var writeToOrbit = await writeArticleToOrbit(req, uploadedFile.hash)
        console.log('orbit shit: ' + writeToOrbit)
        return false;
    } catch (err) {
        console.log(err)
    }
}

async function checkArticleData(req) {

    var errs = []
    const orbitdb = req.app.get('orbit');
    db = await orbitdb.docstore('articles_storage_UI', {overwrite: true})//,
    await db.load()
    var res = await db.query((e) => e._id == req.body.title)
    if (res[0] != null) {
        errs.push("Title " + req.body.title + " already exists!")
    }
    res = await db.query((e) => e.metadata.sha256 == req.file.sha)
    // console.log(await db.query((e) => e.metadata.sha256 == req.file.sha)[0])
    if (res[0] != null) {
        errs.push("Hash error: File exists already!")
    }
    return errs
}

//TODO revisions
async function writeArticleToOrbit(req, ipfsAddress) {
    //create article json
    try {
        var templater = require('json-templater/object')
        var json_art = templater(require(__dirname + '/../templates/article.json'),
            {
                "id": req.file.sha,
                "title": req.body.title,
                "abstract": req.body.articleAbstract,
                "tags": req.body.articleTags,
                "authors": req.body.articleAuthors,
                "owner": req.session.userSha,
                "filesets": [],
                "ipfsAddress": ipfsAddress,
                "originalName": req.file.originalname,
                "encoding": req.file.encoding,
                "mimetype": req.file.mimetype,
                "sha256": req.file.sha
            }
        )
        // console.log(json_art)
        const orbitdb = req.app.get('orbit')
        db = await orbitdb.docstore('articles_storage_UI', {overwrite: true})//,
        await db.load()
        var res = await db.query(e=>e.title==req.body.title)
        // console.log('titleresult')
        // console.log(res)
        if (res[0] == null) {
            await db.put(json_art)
            await db.close()

            //add article to user
            db = await orbitdb.docstore('users_storage_UI', {overwrite: true})
            await db.load()
            var user = await db.get(req.session.userSha)
            // console.log('user1: ' + user)
            // console.log('stringify: ' + JSON.stringify(user))
            if (user[0] == null) {
                user[0] = templater(require(__dirname + '/../templates/user_w_alldata.json'),
                    {
                        "id_hash": req.session.userSha
                    })
            }

            user[0].articles.push(req.file.sha)
            // console.log('user: '+JSON.stringify(user))
            // user.articles.push(req.body.title)
            await db.put(user[0])
            // console.log(user[0]['id'])
            // console.log('get: '+ await JSON.stringify(db.get(user[0]._id)))
            await db.close()


        }
    } catch (err) {
        console.log('Error in add.js:writeArticleToOrbit: ' + err)
    }


}

function pinToCluster(address) {
    return new Promise((resolve, reject) => {
        request
// Configure the request
        var options = {
            url: "http://192.52.3.209:9094/pins/" + address,
            method: "POST",
            headers: {}
        }

// Start the request
        request(options, function (error, response, body) {
            if (!error && true) {
                resolve(true);
            } else {
                console.log(error)
                reject(new Error('pinning failed'));
            }
        })
    })
}

function writeToIpfs(req) {
    return new Promise((resolve, reject) => {
        const ipfs = req.app.get('ipfs');
        var readStream = fs.createReadStream(req.file.path);
        //upload and pin to IPFS
        const stream = ipfs.files.addReadableStream()
        stream.on('data', function (file) {
            resolve(file);
            // 'file' will be of the form
            // {
            //   path: '/tmp/myfile.txt',
            //   hash: 'QmHash' // base58 encoded multihash
            //   size: 123
            // }
        })

        stream.write({
            path: "",
            content: readStream
        })
        stream.end()

    })
}

function hash256(filepath) {
    return new Promise((resolve, reject) => {
        var readStream = fs.createReadStream(filepath);
        var hash = crypto.createHash('sha256');
        readStream
            .on('data', function (chunk) {
                hash.update(chunk);
            })
            .on('end', function () {
                resolve(hash.digest('hex'))
            });
    })
}

function originUpload(articleHash) {
    return new Promise((resolve, reject) => {
        var apiKey = "988e7238-995e-4db0-8277-ce8f75d4b037";
        var baseURL = "https://api.originstamp.org/api/";

        var headers = {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
        }

// Configure the request
        var options = {
            url: baseURL + articleHash,
            method: "GET",
            headers: headers,
        }

// Start the request
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body);
            } else {
                reject(new Error('originstamper failed'));
            }
        })
    })
}

async function ipfsTest(req) {
    return new Promise((resolve, reject) => {
        req.app.get('ipfs').files.get('QmcShxDhecxXRCfPZEtUpd5gW6fz9tEfNHpxB4S1vKkRSV', (err, files) => {
            console.log('hello')
            console.log(err)
            files.forEach((file) => {
                console.log(file.path)
                console.log(file.content.toString('utf8'))
            })
        })

    })
}


module.exports = router;