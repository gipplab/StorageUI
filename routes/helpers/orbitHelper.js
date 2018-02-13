module.exports = {

    async  getData(req, database, mapper) {
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