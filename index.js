// import dependencies and initialize express
const express = require('express');
const path = require('express');
const bodyParser = require('body-parser'),
mongodb = require('mongodb'),
MongoClient = mongodb.MongoClient,
fs = require('fs'),
ObjectId = require('mongodb').ObjectID,
multer = require('multer'),
jwt = require('jsonwebtoken'),
mkdirp = require('mkdirp'),
_ = require('underscore');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log('Multer req ', req.body.filepath)
    fs.mkdir(req.body.filepath,(err)=>{
      cb(null, req.body.filepath);
    })
  },
 
  filename: function(req, file, cb) {
      cb(null, file.originalname);
  }
});
 
var upload = multer({ storage: storage })

// const healthRoutes = require('./routes/health-route');
// const swaggerRoutes = require('./routes/swagger-route');

const app = express();

// enable parsing of http request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function(req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});


var router = express.Router();

router.post('/upload-poster', upload.any(), async (req, res) => {
  // const items = await db.collection('movie').find({}).toArray();
  res.json({ success: true, msg: 'Upload Success' });
})

router.get("/filesystem/*", function(req, res) {
  "use strict";
  var fileFormat = req.params['0'];
  const file = `./${fileFormat}`;
  res.download(file);
});

async function main(){
  /**
   * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
   * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
   */
  const uri = "mongodb+srv://admin:admin@moviedbcluster.ypxyh.mongodb.net/moviedb?retryWrites=true&w=majority";

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  client.connect(async err => {
    const db = client.db('moviedb');
    
    router.post("/auth", async (req, res) => {
      "use strict";
      var userInfo = req.body;
      let user = await db.collection('user').find({ username: userInfo.username, password: userInfo.password }).toArray();
      if (user.length) {
        var token = jwt.sign(userInfo, 'keepitasecret', {
            expiresIn: 86400 // 1 day
        })
        res.json({
          success: true,
          token: token
          });
        } else {
            res.json({
                success: false,
                msg: 'Invalid Credentials'
            });
        }
    });

    router.post('/list-movies', async (req, res) => {
      const items = await db.collection('movie').find({ deleted: { $ne: 'Y' } }).toArray();
      res.json({ success: true, data: items });
    })

    router.post('/save-movie', async (req, res) => {
      var info = req.body.info, q = {};
      console.log('Info')
      console.log(info)
      if (info._id) {
          q = { _id: info._id };
      }
      delete info['_id'];
      if (_.contains(Object.keys(q), '_id')) {
          q['_id'] = ObjectId(q['_id'])
      } else if (q['_id'] === undefined || q['_id'] == '') { // create case only
          q['_id'] = new mongodb.ObjectID();
      }
      const saveInfo = await db.collection('movie').findAndModify(q, [['_id', 'asc']], { $set: info }, { upsert: true, new: true });
      res.json({ success: true, data: saveInfo });

    })
    
    // perform actions on the collection object
    // client.close();
  });

};

main().catch(console.error);
app.use('/', router);



// start node server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server at usual`);
});

// error handler for unmatched routes or api calls
app.use((req, res, next) => {
  // res.sendFile(path.join(__dirname, '../public', '404.html'));
  res.json({ success: "Yes" });
});
