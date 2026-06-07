const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: [
      "http://localhost:5173",
      "https://ass-11-server-sigma.vercel.app/",
    ],
    credentials: true,
  }));
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

async function run() {
  try {
    const dataBase = client.db("Ticket-Bari");

    const ticketsCollection = dataBase.collection("tickets");

    const bookingsCollection = dataBase.collection("bookings");
    const usersCollection = dataBase.collection("users");

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
    // MY TICKETS
    // =======================
    app.get("/myTickets/:email", async (req, res) => {
      const result = await ticketsCollection
        .find({
          vendorEmail: req.params.email,
        })
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
        {
          _id: new ObjectId(req.params.id),
        },
        {
          $set: req.body,
        }
      );

      res.send(result);
    });

    // =======================
    // BOOK TICKET
    // =======================
    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      try {
        // save booking
        const bookingResult = await bookingsCollection.insertOne(booking);

        // reduce quantity
        await ticketsCollection.updateOne(
          {
            _id: new ObjectId(booking.ticketId),
          },
          {
            $inc: {
              quantity: -Number(booking.seats),
            },
          }
        );

        res.send(bookingResult);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Booking failed",
        });
      }
    });

    // =======================
    // CREATE PAYMENT INTENT
    // =======================
    app.post("/create-payment-intent", async (req, res) => {
      const { totalPrice } = req.body;

      const amount = parseInt(totalPrice * 100);

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Payment Intent Failed",
        });
      }
    });

    // =======================
    // UPDATE PAYMENT STATUS
    // =======================
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;

      const paymentData = req.body;

      const result = await bookingsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: paymentData,
        }
      );

      res.send(result);
    });

    // =======================
    // GET SINGLE BOOKING
    // =======================
    app.get("/booking/:id", async (req, res) => {
      const id = req.params.id;

      const result = await bookingsCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // =======================
    // USER BOOKINGS
    // =======================
    app.get("/bookings/:email", async (req, res) => {
      const result = await bookingsCollection
        .find({
          buyerEmail: req.params.email,
        })
        .toArray();

      res.send(result);
    });

    // =======================
    // REQUESTED BOOKINGS
    // =======================
    app.get("/requestedBookings/:email", async (req, res) => {
      const result = await bookingsCollection
        .find({
          vendorEmail: req.params.email,
        })
        .toArray();

      res.send(result);
    });

    // =======================
    // ACCEPT BOOKING
    // =======================
    app.patch("/bookingAccept/:id", async (req, res) => {
      const id = req.params.id;

      const result = await bookingsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            bookingStatus: "accepted",
          },
        }
      );

      res.send(result);
    });
    // =======================
// SAVE USER
// =======================
app.post("/users", async (req, res) => {
  const user = req.body;

  const existingUser = await usersCollection.findOne({
    email: user.email,
  });

  if (existingUser) {
    return res.send({
      message: "user already exists",
    });
  }

  const result = await usersCollection.insertOne(user);

  res.send(result);
});

// =======================
// GET USER BY EMAIL
// =======================
app.get("/users/:email", async (req, res) => {
  const email = req.params.email;

  const result = await usersCollection.findOne({
    email,
  });

  res.send(result);
});

// =======================
// GET ALL USERS
// =======================
app.get("/users", async (req, res) => {
  const result = await usersCollection.find().toArray();

  res.send(result);
});

// =======================
// MAKE ADMIN
// =======================
app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;

  const result = await usersCollection.updateOne(
    {
      _id: new ObjectId(id),
    },
    {
      $set: {
        role: "admin",
      },
    }
  );

  res.send(result);
});

// =======================
// MAKE VENDOR
// =======================
app.patch("/users/vendor/:id", async (req, res) => {
  const id = req.params.id;

  const result = await usersCollection.updateOne(
    {
      _id: new ObjectId(id),
    },
    {
      $set: {
        role: "vendor",
      },
    }
  );

  res.send(result);
});

    // =======================
    // REJECT BOOKING
    // =======================
    app.patch("/bookingReject/:id", async (req, res) => {
      const id = req.params.id;

      const booking = await bookingsCollection.findOne({
        _id: new ObjectId(id),
      });

      // return seats
      await ticketsCollection.updateOne(
        {
          _id: new ObjectId(booking.ticketId),
        },
        {
          $inc: {
            quantity: Number(booking.seats),
          },
        }
      );

      // reject booking
      const result = await bookingsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            bookingStatus: "rejected",
          },
        }
      );

      res.send(result);
    });

  } finally {
  }
}

run().catch(console.dir);

// =======================
// ROOT
// =======================
app.get("/", (req, res) => {
  res.send("Ticket Bari Server Running");
});

// =======================
// SERVER
// =======================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});