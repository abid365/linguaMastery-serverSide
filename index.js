const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middlewares

app.use(cors());
app.use(express.json());

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
    await client.connect();

    const instructorCollection = client
      .db("SummerSchool")
      .collection("Instructors");

    const selectedClassCollection = client
      .db("SummerSchool")
      .collection("selectedClass");

    // api for all
    app.get("/inst", async (req, res) => {
      const instructors = await instructorCollection.find().toArray();
      res.send(instructors);
    });

    // getting loader api
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
