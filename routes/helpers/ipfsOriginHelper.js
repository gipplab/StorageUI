var fs = require('fs');
var crypto = require('crypto');
var request = require('request');


module.exports = {

    /*
*
*
* Data converters
*
* */
    async addDatasetsToArticles(articles, datasets) {
        articles.forEach((article) => {
            var dataResults = []
            article.filesets.forEach((id) => {
                dataResults.push(datasets.find((obj) => {
                    return obj._id == id
                }))
            })
            article.filesets = [];
            dataResults.forEach((data) => article.filesets.push(data))
            // console.log(article.filesets)
        })
        // console.log(articles[0].filesets)
        return articles

    },

    /*
    *
    * IPFS / cluster / Originstamp interaction
    *
    * */
    async addToIPFS(req) {
        try {
            if (typeof req.file == 'undefined') {
                new Error('No File Uploaded!')
            }
            req.file.sha = await this.hash256(req.file.path)

            var originstamp = await this.originUpload(req.file.sha);
            // console.log(originstamp)
            var uploadedFile = await this.writeToIpfs(req)
            console.log('uploaded file: ' + JSON.stringify(uploadedFile))
            var isPinned = await this.pinToCluster(uploadedFile.hash)
            console.log('is pinned: ' + isPinned)
            return uploadedFile.hash
        } catch (err) {
            console.log(err)
            return new Error('ipfsOriginHelper.addToIpfs: ' + err)
        }

    },

    pinToCluster(address) {
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
                    console.log('ipfsOriginHelper.pinToCluster: ' + error)
                    reject(new Error('pinning failed'));
                }
            })
        })
    },

    // 'file' will be of the form
    // {
    //   path: '/tmp/myfile.txt',
    //   hash: 'QmHash' // base58 encoded multihash
    //   size: 123
    // }
    writeToIpfs(req) {
        return new Promise((resolve, reject) => {
            try {
                const ipfs = req.app.get('ipfs');
                var readStream = fs.createReadStream(req.file.path);
                //upload and pin to IPFS
                const stream = ipfs.files.addReadableStream()
                stream.on('data', function (file) {
                    resolve(file);

                })

                stream.write({
                    path: "",
                    content: readStream
                })
                stream.end()
            } catch (err) {
                reject(new Error('ipfsOriginHelper.writeToIpfs: ' + err))
            }
        })
    },

    hash256(filepath) {
        return new Promise((resolve, reject) => {
            try {
                var readStream = fs.createReadStream(filepath);
                var hash = crypto.createHash('sha256');
                readStream
                    .on('data', function (chunk) {
                        hash.update(chunk);
                    })
                    .on('end', function () {
                        resolve(hash.digest('hex'))
                    });
            } catch (err) {
                reject(new Error('ipfsOriginHelper.hash256: ' + err))
            }
        })
    },

    originUpload(articleHash) {
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
                    reject(new Error('originstamper failed' + body));
                }
            })
        })
    },


    async getData(req, database, mapper) {
        const orbitdb = req.app.get('orbit');
        const docdb = await orbitdb.docstore(database, {overwrite: true})//,
        await docdb.load()
        // docdb.drop()
        var docdbres = await docdb.query(mapper)
        // console.log(docdbres)
        docdb.close()
        return docdbres;
    }
}

