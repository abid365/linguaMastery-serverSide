const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middlewares

app.use(cors());
// app.options("", cors(corsConfig));
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// mongodb

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.arpztf9.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
    client.connect();

    const instructorCollection = client
      .db("SummerSchool")
      .collection("Instructors");

    const selectedClassCollection = client
      .db("SummerSchool")
      .collection("selectedClass");

    const userCollection = client
      .db("SummerSchool")
      .collection("userCollection");

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // api for all
    app.get("/inst", async (req, res) => {
      const instructors = await instructorCollection
        .find()
        .sort({
          enrolled_students: 1,
        })
        .toArray();
      res.send(instructors);
    });

    // post data for instructor
    app.post("/inst", async (req, res) => {
      const user = req.body;
      const result = await instructorCollection.insertOne(user);
      res.send(result);
    });

    // api for users
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // we are going to set or create a new object key in collection
      const updateDocument = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(query, updateDocument);
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // we are going to set or create a new object key in collection
      const updateDocument = {
        $set: {
          role: "instructor",
        },
      };
      const result = await userCollection.updateOne(query, updateDocument);
      res.send(result);
    });

    // for detecting admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // detecting instructor
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    // for showing users in admin dashboard
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // deleting user from admin dashboard
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // preventing users to be added twice and sending to db from google signin

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // api for selected classes by user
    app.get("/myclass", async (req, res) => {
      console.log(req.query.user);
      let query = {};
      if (req.query?.user) {
        query = { user: req.query?.user };
        const userClass = await selectedClassCollection.find(query).toArray();
        res.send(userClass);
      }
    });

    // delete class by id from myclass route
    app.delete("/myclass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // getting data by id / loader api
    app.get("/inst/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: {
          course_price: 1,
          teacher: 1,
          available_seats: 1,
          enrolled_students: 1,
          image_url: 1,
          title: 1,
          description: 1,
          course_img: 1,
          _id: 1,
        },
      };
      const result = await instructorCollection.findOne(query, options);
      res.send(result);
    });

    // post for selected classs / my selected class
    app.post("/myclass", async (req, res) => {
      const selected = req.body;
      const result = await selectedClassCollection.insertOne(selected);
      res.send(result);
      console.log(result);
      // console.log(selected);
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
  res.send("Summer School is Running");
});

app.listen(port, () => {
  console.log("Server is running at: ", `${port}`);
});
