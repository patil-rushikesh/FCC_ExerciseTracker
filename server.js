const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const mongoose = require("mongoose");
const { Schema } = require("mongoose");
const { isValidDate, toDateString, checkDate } = require("./utils");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

const exercisesSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String
});

const userSchema = new Schema({
  username: String,
  description: String,
  duration: Number,
  date: exercisesSchema.path("date"),
  log: [exercisesSchema]
});

const User = mongoose.model("User", userSchema);

app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", (req, res) => {
  const username = req.body.username;

  User.findOne({ username }, (err, user) => {
    if (err) console.log(err);

    if (!user) {
      const u = new User({
        username
      });

      u.save();

      res.json(u);
    } else {
      res.json("Username already taken");
    }
  });
});

app.get("/api/users", (req, res) => {
  User.find((err, users) => {
    if (err) console.log(err);
    res.json(users);
  });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const { description, duration, date } = req.body;
  const isValidDateProvided = isValidDate(date);

  if (!description) {
    res.json("Path `description` is required.");
  } else if (!duration) {
    res.json("Path `duration` is required.");
  } else {
    const newExercise = {
      description,
      duration,
      date: toDateString(isValidDateProvided ? date : null)
    };

    User.findOneAndUpdate(
      { _id: req.params._id },
      {
        $push: { log: newExercise },
        description: newExercise.description,
        duration: newExercise.duration,
        date: newExercise.date
      },
      { new: true },
      (err, user) => {
        if (err) {
          console.log(err);
          res.json(
            `Cast to ObjectId failed for value "${req.params._id}" at path "_id" for model "User"`
          );
        }

        if (user) {
          const { _id, username, date, description, duration } = user;
          res.json({ _id, username, date, description, duration });
        }
      }
    );
  }
});

app.get("/api/users/:_id/logs", (req, res) => {
  const { from, to, limit } = req.query;
  console.log("q", req.query);

  User.findById(req.params._id, (err, user) => {
    if (err) console.log(err);

    if (user) {
      const { _id, username, log } = user;
      let logToShow = log
        .filter(
          (l) =>
            checkDate.isBefore(from ?? l.date, l.date) &&
            checkDate.isAfter(to ?? l.date, l.date)
        )
        .slice(0, limit || log.length);

      const count = logToShow?.length ?? 0;
      res.json({ _id, username, count, log: logToShow });
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
