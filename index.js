const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster7.gvmlsqj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster7`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("vehiQuest");
    const userCollection = db.collection("users");
    const carDataCollection = db.collection("carData");
    const bookingCollection = db.collection("bookings");
    // const productsCollection = db.collection("products");

    const verifyToken = (req, res, next) => {
      // console.log("Inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.send(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.send({ token });
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    // Check if user is a seller
    app.get("/users/seller/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isSeller = false;
      if (user) {
        isSeller = user?.role === "seller";
      }
      res.send({ isSeller });
    });

    // Check if user is a buyer
    app.get("/users/buyer/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isBuyer = false;
      if (user) {
        isBuyer = user?.role === "buyer";
      }
      res.send({ isBuyer });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User alredy exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const query = req.body;
      const result = await bookingCollection.insertOne(query);
      res.send(result);
    });
    app.get("/bookings", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.findOne(query);
      res.send(result);
    });

    // category related api
    // app.get("/categories", async (req, res) => {
    //   const result = await categoriesCollection.find().toArray();
    //   res.send(result);
    // });

    // products related api
    app.patch("/carData/advertise/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          advertised: true,
        },
      };
      const result = await carDataCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.get("/carData/advertise", async (req, res) => {
      const query = { advertised: true };
      const result = await carDataCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/carData", async (req, res) => {
      const result = await carDataCollection.find().toArray();
      res.send(result);
    });
    app.get("/myCarData", async (req, res) => {
      const email = req.query.email;
      if (email) {
        const query = { sellerEmail: email };
        const result = await carDataCollection.find(query).toArray();
        res.send(result);
      } else {
        res.status(400).send({ message: "Email query parameter is required" });
      }
    });
    app.get("/carData/:id", async (req, res) => {
      const id = parseInt(req.params.id);
      const query = { cars_id: id };
      const result = await carDataCollection.findOne(query);
      res.send(result);
    });
    app.post("/carData", async (req, res) => {
      const query = req.body;
      const result = await carDataCollection.insertOne(query);
      res.send(result);
    });
    app.delete("/carData/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carDataCollection.deleteOne(query);
      res.send(result);
    });

    // seller related api
    app.get("/users/sellers", async (req, res) => {
      const query = { role: "seller" };
      const sellers = await userCollection.find(query).toArray();
      res.send(sellers);
    });
    app.delete("/users/sellers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users/buyers", async (req, res) => {
      const query = { role: "buyer" };
      const buyers = await userCollection.find(query).toArray();
      res.send(buyers);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("vehi quest server running");
});
app.listen(port, () => {
  console.log(`vehi quest server running on port ${port}`);
});
