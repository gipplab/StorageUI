var express = require('express');
var router = express.Router();
var helper = require(__dirname+'/helpers/ipfsOriginHelper');

var multer = require('multer');
var upload = multer({dest: __dirname + '/uploads'});


/* GET home page. */
router.get('/', async function (req, res, next) {
//TODO stump
/*    req.session.userSha = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    req.session.loggedin = true*/


    if(!req.session.loggedin){req.session.loginErrs = [{msg: 'Please login first!'}]; req.session.redirect="/modify"; res.redirect('/login'); return  }

    var articles = await getData(req, 'articles_storage_UI' , e=>e.owner == req.session.userSha)
    var datasets =  await getData(req,'files_storage_UI', e=>e.owner == req.session.userSha)
    var newArticles = await helper.addDatasetsToArticles(articles, datasets);
    res.render('modify', {
        loggedin: req.session.loggedin,
        modify: true,
        articles: newArticles,
        datasets:datasets
    });
    await testDatabase(req)
    // await dropDatabase(req)
});

router.post('/modifyArticle', upload.single('upl'), async function (req, res, next) {
    // req.body.title, articleAbstract, articleAuthors, articleTags
    // console.log('body: ')
    try{
/*    console.log('body: ')
    console.log(req.body)
    console.log(req.file)*/
    var article = await getData(req, 'articles_storage_UI', e=>e.metadata.sha256 == req.body.sha256)
    if(article[0] != null){
        article[0].title = req.body.title
        article[0].abstract = req.body.abstract
        article[0].authors = req.body.authors
        article[0].tags = req.body.tags
        console.log(req.file)
        if (typeof req.file != 'undefined') {
           var address =  await helper.addToIPFS(req)
            if (!article[0].revisions.includes(address)) {
                article[0].revisions.push(address)
            }
        }
        await pushToOrbit(req, 'articles_storage_UI', article[0])
    }
    // console.log('article: ')
    // console.log(article)
    res.redirect('/modify')
    } catch (err){
        console.log('modifyArticle error : '+err)
    }
})

router.post('/modifyDataset', async function (req, res, next) {
    // req.body.title, articleAbstract, articleAuthors, articleTags
    // console.log('body: ')
    try{
        console.log('body: ')
        console.log(req.body)
        var article = await getData(req, 'files_storage_UI', e=>e.metadata.sha256 == req.body.sha256)
        console.log(article)
        if(article[0] != null){
            article[0].title = req.body.title
            article[0].abstract = req.body.abstract
            article[0].authors = req.body.authors
            article[0].tags = req.body.tags
            /*console.log(req.file)
            if (typeof req.file != 'undefined') {
                var address =  await helper.addToIPFS(req)
                if (!article[0].revisions.includes(address)) {
                    article[0].revisions.push(address)
                }
            }*/
            await pushToOrbit(req, 'files_storage_UI', article[0])
        }
        // console.log('article: ')
        // console.log(article)
        res.redirect('/modify')
    } catch (err){
        console.log('modifyArticle error : '+err)
    }
})

async function pushToOrbit(req, db, doc){
    try{
    const orbitdb = req.app.get('orbit');
    const docdb = await orbitdb.docstore(db, {overwrite: true})//,
    await docdb.load()
    // docdb.drop()
    var docdbres = await docdb.put(doc)
    // console.log(docdbres)
    docdb.close()
    } catch (err){
        console.log('pushToOrbit Error: ' + err);
    }
}

async function getData(req, database, mapper) {
    const orbitdb = req.app.get('orbit');
    const docdb = await orbitdb.docstore(database, {overwrite: true})//,
    await docdb.load()
    // docdb.drop()
    var docdbres = await docdb.query(mapper)
    console.log(docdbres)
    docdb.close()
    return docdbres;
}


async function testDatabase(req) {
    const orbitdb = req.app.get('orbit');
    const userdb = await orbitdb.docstore('users_storage_UI', {overwrite: true})
    // userdb.drop()
    await userdb.load()
    var userdbres = await userdb.get("");
    console.log('users: ')
    console.log(userdbres)
    userdb.close()

    const docdb = await orbitdb.docstore('articles_storage_UI', {overwrite: true})//,
    await docdb.load()
    // docdb.drop()
    var docdbres = await docdb.get("")
    console.log('articles: ')
    console.log(docdbres)
    docdb.close()

    const filedb = await orbitdb.docstore('files_storage_UI', {overwrite: true})//,
    await filedb.load()
    // filedb.drop()
    var filedbres = await filedb.get("")
    console.log('filesets: ')
    console.log(filedbres)
    filedb.close()

    // res.send('userdb: ' + userdbres + ' docdb: ' + docdbres + ' filedb: ' + filedbres)


}

async function dropDatabase(req){
    const orbitdb = req.app.get('orbit');
    const userdb = await orbitdb.docstore('users_storage_UI', {overwrite: true})
    userdb.drop()
    await userdb.load()
    var userdbres = await userdb.get("");
    console.log('users: ')
    console.log(userdbres)
    userdb.close()

    const docdb = await orbitdb.docstore('articles_storage_UI', {overwrite: true})//,
    await docdb.load()
    docdb.drop()
    var docdbres = await docdb.get("")
    console.log('articles: ')
    console.log(docdbres)
    docdb.close()

    const filedb = await orbitdb.docstore('files_storage_UI', {overwrite: true})//,
    await filedb.load()
    filedb.drop()
    var filedbres = await filedb.get("")
    console.log('filesets: ')
    console.log(filedbres)
    filedb.close()
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


module.exports = router;