import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = 3000;

// Middleware
app.use(express.static(__dirname));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Supabase setup
const supabaseUrl = "https://xgyovlsyghgjzpwtcsay.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhneW92bHN5Z2hnanpwd3Rjc2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTczNDEsImV4cCI6MjA2Njk3MzM0MX0.KFyvvHXhOb9uTsvI69VG-fy0HJVNjSy1IFuAmAByRxI";
const supabase = createClient(supabaseUrl, supabaseKey);

// Reservation endpoint
app.post("/reserve", async (req, res) => {
  const { name, email, phone, date, time, guests, seating, message } = req.body;

  // ✅ Log incoming data
  console.log("Received reservation:", req.body);

  // Check if reservation already exists at same time and date
  const { data: existing, error: checkError } = await supabase
    .from("reservations")
    .select("*")
    .eq("date", date)
    .eq("time", time);

  if (checkError) {
    console.error("Error checking existing reservation:", checkError);
    return res.status(500).json({ error: "Error checking reservation availability." });
  }

  if (existing && existing.length > 0) {
    return res.status(400).json({ error: "Sorry, that time slot is already booked." });
  }

  // Insert new reservation
  const { data, error } = await supabase
    .from("reservations")
    .insert([
      {
        name,
        email,
        phone,
        date,
        time,
        guests: parseInt(guests),
        seating,
        message,
      }
    ]);

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  res.json({ success: true, message: "Reservation confirmed!" });
});

app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
