const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@book-haven.xdmsye5.mongodb.net/`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {

  try {

    // database
    const dataBase = client.db("Ticket-Bari");

    // collection
    const ticketsCollection = dataBase.collection("tickets");

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // =========================================
    // GET ALL APPROVED TICKETS
    // =========================================

    app.get("/tickets", async (req, res) => {

      const query = {
        status: "approved",
      };

      const result = await ticketsCollection
        .find(query)
        .toArray();

      res.send(result);

    });

    // =========================================
    // GET SINGLE TICKET
    // =========================================

    app.get("/tickets/:id", async (req, res) => {

      const id = req.params.id;

      const query = {
        _id: new ObjectId(id),
      };

      const result = await ticketsCollection.findOne(query);

      res.send(result);

    });

    // =========================================
    // ADD NEW TICKET
    // =========================================

    app.post("/tickets", async (req, res) => {

      const newTicket = req.body;

      const result = await ticketsCollection.insertOne(newTicket);

      res.send(result);

    });

  } finally {

  }
}

run().catch(console.dir);

// root route
app.get("/", (req, res) => {

  res.send("Ticket Bari Server Running");

});

// server run
app.listen(port, () => {

  console.log(`Server running on port ${port}`);

});