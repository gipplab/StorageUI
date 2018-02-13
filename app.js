var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var lessMiddleware = require('less-middleware');
var expressValidator = require('express-validator');
var expressSession = require('express-session');



var index = require('./routes/index');
var users = require('./routes/users');
var add = require('./routes/add');
var login = require('./routes/login');
var register = require('./routes/register');
var search = require('./routes/search');
var modify = require('./routes/modify');
var api = require('./routes/api');



// const IpfsApi = require('ipfs-api')

// const ipfs = IpfsApi('localhost', '5001')
// const orbit = new OrbitDB(ipfs)

const IPFS = require('ipfs');
const OrbitDB = require('orbit-db');

//"/ip4/192.52.3.142/tcp/4002/ipfs/QmdryZ1pwcgFwtX7SUVZQLHb4kDsmAJABxSz4cGEhwe6Us"

const repo = __dirname+'/ipfs_repo';
// console.log(repo)
const ipfs = new IPFS({
    repo: repo,
    start: true,
    EXPERIMENTAL: {
        pubsub: true,
    },
});
ipfs.on('error', (err) => {
    console.log(err)
});
orbit = null

// ipfs.version((err, version) => {
//     if (err) {
//         throw err
//     }
//     console.log(version)
// })
ipfs.on('ready', () => {
    ipfs.swarm.connect('/ip4/192.52.3.209/tcp/4001/ipfs/QmSq2h1kmW8yjSm6sMbeYeJbRHgZmXZ8VxyW959SSbMkRw')
    // ipfs.files.get('QmcShxDhecxXRCfPZEtUpd5gW6fz9tEfNHpxB4S1vKkRSV', (err, files) => {
    //     console.log('hello')
    //     console.log(err)
    //     files.forEach((file) => {
    //         console.log(file.path)
    //         console.log(file.content.toString('utf8'))
    //     })
    // })
})






var app = express();
app.set('ipfs', ipfs);
ipfs.on('ready', () => {
    orbit = new OrbitDB(ipfs)
    app.set('orbit', orbit)
})
// app.set('orbit', orbit)

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//here the validator because needs access to bodyParser
app.use(expressValidator());

app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSession({secret: 'max', saveUninitialized: false, resave: false})); //change to mongodb in future...now is memory


app.use('/', index);
app.use('/users', users);
app.use('/add', add);
app.use('/login', login);
app.use('/register', register);
app.use('/search', search);
app.use('/modify', modify);
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
