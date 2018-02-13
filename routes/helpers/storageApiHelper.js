var ipfsOriginHelper = require(__dirname+'/ipfsOriginHelper');
var orbitHelper = require(__dirname+'/orbitHelper');
var templater=require('json-templater/object');


module.exports = {
/*
* article: takes json object /templates/article.json style.
* */
    async writeArticleToOrbit(req, article) {
        //create article json
        try {
            const orbitdb = req.app.get('orbit')
            db = await orbitdb.docstore('articles_storage_UI', {overwrite: true})//,
            await db.load()
            var res = await db.query(e=>e.title==article.title)
            if (res[0] == null) {
                await db.put(article)
                await db.close()

                //add article to user
                db = await orbitdb.docstore('users_storage_UI', {overwrite: true})
                await db.load()
                var user = await db.get(article.owner)
                // console.log('user1: ' + user)
                // console.log('stringify: ' + JSON.stringify(user))
                if (user[0] == null) {
                    user[0] = templater(require(__dirname + '/../../templates/user_w_alldata.json'),
                        {
                            "id_hash": article.owner
                        })
                }

                user[0].articles.push(article._id)
                console.log('user: '+JSON.stringify(user))
                // user.articles.push(req.body.title)
                await db.put(user[0])
                // console.log(user[0]['id'])
                // console.log('get: '+ await JSON.stringify(db.get(user[0]._id)))
                await db.close()
                return false
            } else {
                //error
                return new Error("Article title already exists.")            }
        } catch (err) {
            console.log('Error in storageApiHelper:writeArticleToOrbit: ' + err)
            return new Error("Something went wrong at writing to Orbit.")
        }

    },

    async writeAdditionalFileToOrbit(req, article, articleSha) {
        //create article json
        try {
            const orbitdb = req.app.get('orbit')
            db = await orbitdb.docstore('files_storage_UI', {overwrite: true})//,
            await db.load()
            var res = await db.query(e=>e._id==article._id)
            if (res[0] == null) {
                await db.put(article)
                await db.close()

                //add fileset to user
                db = await orbitdb.docstore('users_storage_UI', {overwrite: true})
                await db.load()
                var user = await db.get(article.owner)
                if (user[0] == null) {
                    user[0] = templater(require(__dirname + '/../../templates/user_w_alldata.json'),
                        {
                            "id_hash": article.owner
                        })
                }

                user[0].filesets.push(article._id)
                await db.put(user[0])
                await db.close()

                //add fileset to article
                db = await orbitdb.docstore('articles_storage_UI', {overwrite: true})//,
                await db.load()
                var dbArticle = await db.query(e=>e._id==req.body.articleSha)
                console.log(article);
                if (dbArticle[0] != null) {
                    dbArticle[0].filesets.push(article._id)
                    console.log(article[0]);
                    await db.put(dbArticle[0])

                }
                await db.close()

                return false
            } else {
                //error
                return new Error("AdditionalFIle title already exists.")            }
        } catch (err) {
            console.log('Error in storageApiHelper:writeAdditionalFileToOrbit: ' + err)
            return new Error("Something went wrong at writing to Orbit.")
        }

    },

    async checkArticleUploadMetadata(req){
        var errors = [];
        var article=await orbitHelper.getData(req, 'articles_storage_UI' , e=>e._id == req.file.sha)
        if(typeof article[0] != 'undefined')
            errors.push({msg: 'Article (hash) already existing!', article: article[0]})
        if(typeof req.body.title == 'undefined' || req.body.title == "")
            errors.push({msg: 'No article title provided!'})
        article=await orbitHelper.getData(req, 'articles_storage_UI', e=>e.title == req.body.title)
        if(article[0] != null)
            errors.push({msg: 'Article title already existing!', article:article[0]})
        if(typeof req.body.abstract == 'undefined' || req.body.abstract == "")
            errors.push({msg: 'Abstract field missing!'})


        if(typeof errors[0] == 'undefined'){
             return false;
        }else
            return errors

    },

    async checkAdditionalFileUploadMetadata(req){
        var errors = [];
        var article=await orbitHelper.getData(req, 'files_storage_UI' , e=>e._id == req.file.sha)
        if(typeof article[0] != 'undefined')
            errors.push({msg: 'Additional file (hash) already existing!', file: article[0]})
        if(typeof req.body.title == 'undefined' || req.body.title == "")
            errors.push({msg: 'No additional file title provided!'})
        article=await orbitHelper.getData(req, 'files_storage_UI', e=>e.title == req.body.title)
        if(article[0] != null)
            errors.push({msg: 'Additional file title already existing!', file:article[0]})
        console.log(req.body)
        if(req.body.articleSha){
            article =  await orbitHelper.getData(req, 'articles_storage_UI', e=>e._id == req.body.articleSha)
            console.log(article)
            if(!article[0]){
                errors.push({msg: 'Main article not uploaded yet! Please upload the article first!'})
            }
        }
       /* if(typeof req.body.abstract == 'undefined' || req.body.abstract == "")
            errors.push({msg: 'Abstract field missing!'})*/


        if(typeof errors[0] == 'undefined'){
            return false;
        }else
            return errors

    }

}