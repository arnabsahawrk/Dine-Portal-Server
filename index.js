const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//config
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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

//Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

//Send and Get data from sever to database
async function run() {
  try {
    //Database
    const dinePortalDB = client.db("dine-portal");
    //All Collections
    const allFoods = dinePortalDB.collection("all-foods");
    const allOrders = dinePortalDB.collection("all-orders");
    const allFeedbacks = dinePortalDB.collection("all-feedbacks");
    const paymentCollection = dinePortalDB.collection("all-payments");

    //Insert Food api
    app.post("/foods", verifyToken, async (req, res) => {
      const food = req.body;
      const insertedFood = await allFoods.insertOne(food);
      res.send(insertedFood);
    });

    //Get Top Foods api
    app.get("/topFoods", async (req, res) => {
      const skip = parseFloat(req.query.skip);
      const limit = parseFloat(req.query.limit);
      const options = { sort: { sold: -1 } };

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

    //Insert Order api
    app.post("/orders", verifyToken, async (req, res) => {
      const order = req.body;

      const insertedOrder = await allOrders.insertOne(order);

      res.send(insertedOrder);
    });

    //Increment Sold and Decrement Quantity
    app.patch("/foodSold", async (req, res) => {
      const { foodId, buyerQuantity } = req.body;
      const query = { _id: new ObjectId(foodId) };
      const updateDoc = {
        $inc: { quantity: -buyerQuantity, sold: buyerQuantity },
      };

      const result = await allFoods.updateOne(query, updateDoc);

      res.send(result);
    });

    //Get Added Foods api
    app.get("/addedFoods/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const { email } = req.params;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const getAddedFoods = await allFoods
        .find({
          userEmail: email,
        })
        .toArray();

      res.send(getAddedFoods);
    });

    //Update added foods api
    app.patch("/addedFoods/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const formData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { ...formData } };

      const updateResult = await allFoods.updateOne(filter, updateDoc);

      res.send(updateResult);
    });

    //Get ordered Foods api
    app.get("/orderedFoods/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const { email } = req.params;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const getOrderedFoods = await allOrders
        .find({
          BuyerEmail: email,
        })
        .toArray();

      res.send(getOrderedFoods);
    });

    //Delete ordered foods api
    app.delete("/orders/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };

      const cancelOrder = await allOrders.deleteOne(query);
      res.send(cancelOrder);
    });

    //Increment Quantity and Decrement Sold
    app.patch("/cancelOrder", async (req, res) => {
      const { foodId, buyerQuantity } = req.body;
      const query = { _id: new ObjectId(foodId) };
      const updateDoc = {
        $inc: { quantity: buyerQuantity, sold: -buyerQuantity },
      };

      const result = await allFoods.updateOne(query, updateDoc);

      res.send(result);
    });

    //foodName Search api
    app.get("/foods/search", async (req, res) => {
      const query = req.query.s;
      const regex = new RegExp(query, "i");

      const searchResult = await allFoods
        .find({ foodName: { $regex: regex } })
        .toArray();

      res.send(searchResult);
    });

    //Feedback Post
    app.post("/feedback", verifyToken, async (req, res) => {
      const feedback = req.body;
      const insertedFeedback = await allFeedbacks.insertOne(feedback);

      res.send(insertedFeedback);
    });

    //Bring All Feedbacks Data
    app.get("/feedback", async (req, res) => {
      const skip = parseFloat(req.query.skip);
      const limit = parseFloat(req.query.limit);
      const getAllFeedbacks = await allFeedbacks
        .find({})
        .skip(skip * limit)
        .limit(limit)
        .toArray();

      res.send(getAllFeedbacks);
    });

    //Get Total Feedback Count
    app.get("/feedback/count", async (req, res) => {
      const feedbackCount = await allFeedbacks.estimatedDocumentCount();

      res.send({ count: feedbackCount });
    });

    //Get Filter Result
    app.get("/foods/filter", async (req, res) => {
      const filterValue = req.query.f;
      let filterResult;
      switch (filterValue) {
        case "low":
          filterResult = await allFoods.find({}).sort({ price: 1 }).toArray();
          break;
        case "high":
          filterResult = await allFoods.find({}).sort({ price: -1 }).toArray();
          break;
        case "sold":
          filterResult = await allFoods.find({}).sort({ sold: -1 }).toArray();
          break;
        default:
          filterResult = await allFoods
            .find({ foodCategory: filterValue })
            .toArray();
          break;
      }

      res.send(filterResult);
    });

    //Payment Related Api
    //create payment intent
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const priceInCent = parseFloat(req.body.price) * 100;

      if (parseFloat < 1) return;

      //generate client secret
      const { client_secret } = await await stripe.paymentIntents.create({
        amount: priceInCent,
        currency: "inr",

        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.send({ clientSecret: client_secret });
    });

    //save payment history
    app.post("/payments", verifyToken, async (req, res) => {
      const payment = req.body;

      const insertedPayment = await paymentCollection.insertOne(payment);

      res.send(insertedPayment);
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
