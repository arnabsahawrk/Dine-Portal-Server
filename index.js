const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//config
require("dotenv").config();
const port = process.env.PORT || 8080;
const app = express();

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://arnabsahawrk-dine-portal.web.app",
    "https://arnabsahawrk-dine-portal.firebaseapp.com",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

//middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

//Database Authenticate
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2p5zaxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//Send and Get data from sever to database
async function run() {
  try {
    //Database
    const dinePortalDB = client.db("dine-portal");
    //All Collections
    const allFoods = dinePortalDB.collection("all-foods");

    //Insert Food api
    app.post("/foods", async (req, res) => {
      const food = req.body;
      const insertedFood = await allFoods.insertOne(food);
      res.send(insertedFood);
    });

    //Get Top Foods api
    app.get("/topFoods", async (req, res) => {
      const skip = parseFloat(req.query.skip);
      const limit = parseFloat(req.query.limit);
      const options = { sort: { sold: 1 } };

      const getTopFoods = await allFoods
        .find({}, options)
        .skip(skip)
        .limit(limit)
        .toArray();

      res.send(getTopFoods);
    });

    //Get All Foods api
    app.get("/allFoods", async (req, res) => {
      const getAllFoods = await allFoods.find({}).toArray();

      res.send(getAllFoods);
    });

    //Get Single Food api
    app.get("/allFoods/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };

      const getSingleFood = await allFoods.findOne(query);

      res.send(getSingleFood);
    });

    //JWT api
    app.post("/jwt", (req, res) => {
      const user = req.body;

      //Generate The Token
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2d",
      });

      //Sending The Cookie
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    //Clear cookie api
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });
  } catch (err) {
    console.log("Error from database:", err);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`Server is running on ${port}`);
});

app.listen(port, () => {
  console.log(`Server connected on ${port}`);
});
