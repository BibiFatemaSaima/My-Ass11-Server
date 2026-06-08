const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ass-11-server-sigma.vercel.app",

    ],
    credentials: true,
  })
);

app.use(express.json());

// =======================
// STRIPE
// =======================
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// =======================
// MONGODB
// =======================
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@book-haven.xdmsye5.mongodb.net/`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// =======================
// CONNECT + ROUTES
// =======================
async function run() {
  try {
     console.log("Starting run function...");
    await client.connect();

    const db = client.db("Ticket-Bari");

    const ticketsCollection = db.collection("tickets");
    const bookingsCollection = db.collection("bookings");
    const usersCollection = db.collection("users");

    console.log("MongoDB Connected!");

    // =======================
    // USERS
    // =======================
    app.post("/users", async (req, res) => {
      const user = req.body;

      const existingUser = await usersCollection.findOne({
        email: user.email,
      });

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const result = await usersCollection.findOne({
        email: req.params.email,
      });
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { role: "admin" } }
      );
      res.send(result);
    });

    app.patch("/users/vendor/:id", async (req, res) => {
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { role: "vendor" } }
      );
      res.send(result);
    });

    // =======================
    // TICKETS
    // =======================
    app.get("/tickets", async (req, res) => {
      const result = await ticketsCollection
        .find({ status: "approved" })
        .toArray();
      res.send(result);
    });

    app.get("/tickets/:id", async (req, res) => {
      const result = await ticketsCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.post("/tickets", async (req, res) => {
      const result = await ticketsCollection.insertOne(req.body);
      res.send(result);
    });

    app.put("/tickets/:id", async (req, res) => {
      const result = await ticketsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    });

    app.delete("/tickets/:id", async (req, res) => {
      const result = await ticketsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.get("/myTickets/:email", async (req, res) => {
      const result = await ticketsCollection
        .find({ vendorEmail: req.params.email })
        .toArray();
      res.send(result);
    });

    // =======================
    // BOOKINGS
    // =======================
    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      const result = await bookingsCollection.insertOne(booking);

      await ticketsCollection.updateOne(
        { _id: new ObjectId(booking.ticketId) },
        { $inc: { quantity: -Number(booking.seats) } }
      );

      res.send(result);
    });

    app.get("/bookings/:email", async (req, res) => {
      const result = await bookingsCollection
        .find({ buyerEmail: req.params.email })
        .toArray();
      res.send(result);
    });

    app.get("/booking/:id", async (req, res) => {
      const result = await bookingsCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    });

    app.get("/requestedBookings/:email", async (req, res) => {
      const result = await bookingsCollection
        .find({ vendorEmail: req.params.email })
        .toArray();
      res.send(result);
    });

    app.patch("/bookingAccept/:id", async (req, res) => {
      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { bookingStatus: "accepted" } }
      );
      res.send(result);
    });

    app.patch("/bookingReject/:id", async (req, res) => {
      const booking = await bookingsCollection.findOne({
        _id: new ObjectId(req.params.id),
      });

      await ticketsCollection.updateOne(
        { _id: new ObjectId(booking.ticketId) },
        { $inc: { quantity: Number(booking.seats) } }
      );

      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { bookingStatus: "rejected" } }
      );

      res.send(result);
    });

    // =======================
    // STRIPE
    // =======================
    app.post("/create-payment-intent", async (req, res) => {
      const { totalPrice } = req.body;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: parseInt(totalPrice * 100),
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });
  } catch (error) {
    console.error("FULL ERROR =>", error);
  }
}

run();

// =======================
// ROOT
// =======================
app.get("/", (req, res) => {
  res.send("Ticket Bari Server Running");
});
app.get("/test", (req, res) => {
  res.send("Test Route Working");
});

// =======================
// EXPORT (Vercel)
// =======================
module.exports = app;