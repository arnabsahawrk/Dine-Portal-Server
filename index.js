const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");

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
