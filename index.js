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
    const dataBase = client.db("Ticket-Bari");

    const ticketsCollection = dataBase.collection("tickets");
    const bookingsCollection = dataBase.collection("bookings");

    console.log("MongoDB Connected!");

    // =======================
    // GET APPROVED TICKETS
    // =======================
    app.get("/tickets", async (req, res) => {
      const result = await ticketsCollection
        .find({ status: "approved" })
        .toArray();

      res.send(result);
    });

    // =======================
    // GET SINGLE TICKET
    // =======================
    app.get("/tickets/:id", async (req, res) => {
      const id = req.params.id;

      const result = await ticketsCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // =======================
    // ADD TICKET
    // =======================
    app.post("/tickets", async (req, res) => {
      const result = await ticketsCollection.insertOne(req.body);
      res.send(result);
    });

    // =======================
    // MY TICKETS (VENDOR)
    // =======================
    app.get("/myTickets/:email", async (req, res) => {
      const result = await ticketsCollection
        .find({ vendorEmail: req.params.email })
        .toArray();

      res.send(result);
    });

    // =======================
    // DELETE TICKET
    // =======================
    app.delete("/tickets/:id", async (req, res) => {
      const result = await ticketsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });

      res.send(result);
    });

    // =======================
    // UPDATE TICKET
    // =======================
    app.put("/tickets/:id", async (req, res) => {
      const result = await ticketsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: req.body,
        }
      );

      res.send(result);
    });

    // =======================
    // BOOKING + QUANTITY REDUCE (MAIN FIX)
    // =======================
    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      try {
        // save booking
        const bookingResult = await bookingsCollection.insertOne(booking);

        // reduce ticket quantity
        await ticketsCollection.updateOne(
          { _id: new ObjectId(booking.ticketId) },
          {
            $inc: {
              quantity: -Number(booking.seats),
            },
          }
        );

        res.send(bookingResult);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Booking failed" });
      }
    });

    // =======================
    // USER BOOKINGS
    // =======================
    app.get("/bookings/:email", async (req, res) => {
      const result = await bookingsCollection
        .find({ buyerEmail: req.params.email })
        .toArray();

      res.send(result);
    });

    // =======================
    // REQUESTED BOOKINGS (VENDOR)
    // =======================
    app.get("/requestedBookings/:email", async (req, res) => {
      const result = await bookingsCollection
        .find({ vendorEmail: req.params.email })
        .toArray();

      res.send(result);
    });

  } finally {
    // safe
  }
}

run().catch(console.dir);

// root
app.get("/", (req, res) => {
  res.send("Ticket Bari Server Running");
});

// start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});