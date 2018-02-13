var sha256 = require('sha256')

module.exports = {

    async checkLoginSubmit(req, usernamesha, passwordsha) {
        var res = await this.getPassword(req, usernamesha)
        var errs = [];
        console.log(res)
        console.log(passwordsha)
        // console.log(errs)
        if (res === undefined) {
            errs.push({msg: 'Username not existing!'})
            // console.log('true')
            // console.log(res);
        } else if (res != passwordsha) {
            errs.push({msg: 'Wrong password!'})
        } else {
            errs = false;
        }
        return errs;
    },

    async checkRegisterSubmit(req, usernamesha, passwordsha, passwordrepsha) {
        var errs = [];


        var res = await this.getPassword(req, usernamesha)
        if (res !== undefined) {
            errs.push({msg: 'Username already taken'})
            // console.log('true')
            // console.log(res);
        }
        if (passwordsha == 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') {
            errs.push({msg: 'Password is empty!'})
        }
        if (passwordsha != passwordrepsha) {
            errs.push({msg: 'Passwords are not the same!'})
        }
        if (usernamesha == 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') {
            errs.push({msg: 'Username is empty!'})
        }
        if (errs[0] == null) {
            errs = false
        }
        return errs

    },

    async getPassword(req, usernamesha) {
        try {
            const orbitdb = req.app.get('orbit')
            db = await
                orbitdb.kvstore('pwDB', {overwrite: true})//,
            await
                db.load()
            var result = await
                db.get(usernamesha)
            db.close()
            return result
        } catch (err) {
            return new Error('loginRegisterHelper.getPassword: ' + err)
        }
    }
    ,

    async userToDb(req, usernamesha, passwordsha) {
        try {
            const orbitdb = req.app.get('orbit')
            db = await
                orbitdb.kvstore('pwDB', {overwrite: true})//,
            await
                db.load()
            var result = await
                db.put(usernamesha, passwordsha)
            db.close()
            return false
        } catch (err) {
            return new Error('loginRegisterHelper.userToDb: ' + err)
        }


    }


}