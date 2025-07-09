import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import dotenv from "dotenv";
import dayjs from "dayjs"; // for date formatting
dotenv.config();

// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express setup
const app = express();
const port = 3000;
app.use(express.static(__dirname));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Supabase
const supabaseUrl = "https://xgyovlsyghgjzpwtcsay.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhneW92bHN5Z2hnanpwd3Rjc2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTczNDEsImV4cCI6MjA2Njk3MzM0MX0.KFyvvHXhOb9uTsvI69VG-fy0HJVNjSy1IFuAmAByRxI";
const supabase = createClient(supabaseUrl, supabaseKey);

// Resend
const resend = new Resend("re_X27pyMyq_APst9jGaKQmCppMaUCT9TKC1");

// Restaurant email
const restaurantEmail = "yourrestaurant@email.com"; // change this

// Reservation endpoint
app.post("/reserve", async (req, res) => {
  const { name, email, phone, date, time, guests, seating, message } = req.body;

  // Check existing reservations
  const { data: existing, error: checkError } = await supabase
    .from("reservations")
    .select("*")
    .eq("date", date)
    .eq("time", time);

  if (checkError) {
    return res.status(500).json({ error: "Error checking reservation availability." });
  }

  if (existing && existing.length > 0) {
    return res.status(400).json({ error: "Sorry, that time slot is already booked." });
  }

  // Save reservation
  const { error } = await supabase.from("reservations").insert([
    {
      name,
      email,
      phone,
      date,
      time,
      guests: parseInt(guests),
      seating,
      message,
    },
  ]);

  if (error) {
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  // Generate calendar link
  const start = dayjs(`${date}T${time}`);
  const end = start.add(2, "hour");
  const formattedStart = start.format("YYYYMMDDTHHmmss");
  const formattedEnd = end.format("YYYYMMDDTHHmmss");
  const calendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=Reservation+at+Espaco+Trium&dates=${formattedStart}/${formattedEnd}&details=Reservation+for+${guests}+people+with+${name}&location=Espaco+Trium,+Cascais`;

  // Simple language fallback
  const isPortuguese = email.endsWith(".pt") || seating === "fora";

  const guestEmail = {
    from: "onboarding@resend.dev",
    to: email,
    subject: isPortuguese ? "Confirmação de Reserva" : "Reservation Confirmation",
    html: `
      <div style="font-family: sans-serif; font-size: 16px;">
        <p>${isPortuguese ? `Olá ${name},` : `Hello ${name},`}</p>
        <p>
          ${isPortuguese
            ? `Sua reserva foi confirmada para <strong>${guests}</strong> pessoa(s) no dia <strong>${date}</strong> às <strong>${time}</strong>.`
            : `Your reservation is confirmed for <strong>${guests}</strong> guest(s) on <strong>${date}</strong> at <strong>${time}</strong>.`}
        </p>
        <p>${isPortuguese ? `Local: Espaço Trium, Cascais.` : `Location: Espaço Trium, Cascais.`}</p>
        <p>
          📅 <a href="${calendarLink}" target="_blank" style="color:#8c4f30;">${
            isPortuguese ? "Adicionar ao Calendário" : "Add to Calendar"
          }</a>
        </p>
        <p>${isPortuguese ? "Obrigado!" : "Thank you!"}</p>
      </div>
    `,
  };

  const restaurantEmailContent = {
    from: "onboarding@resend.dev",
    to: restaurantEmail,
    subject: "📥 New Reservation Received",
    html: `
      <div style="font-family: sans-serif; font-size: 16px;">
        <p><strong>New Reservation</strong></p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Guests:</strong> ${guests}</p>
        <p><strong>Seating:</strong> ${seating}</p>
        <p><strong>Note:</strong> ${message || "None"}</p>
        <p>📅 <a href="${calendarLink}" target="_blank" style="color:#8c4f30;">Add to Calendar</a></p>
      </div>
    `,
  };

  // Send emails
  try {
    await resend.emails.send(guestEmail);
    await resend.emails.send(restaurantEmailContent);
    res.json({ success: true, message: "Reservation and emails sent!" });
  } catch (emailError) {
    console.error("Email error:", emailError);
    res.status(500).json({ error: "Reservation saved, but email failed to send." });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
