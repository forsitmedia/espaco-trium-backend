const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const dotenv = require("dotenv");
const dayjs = require("dayjs");
// const path = require("path");       // ❌ no need if we don’t write files
// const fs = require("fs");           // ❌ no need if we don’t write files

dotenv.config();

const app = express();
// ✅ CHANGED: use Render’s dynamic port when deployed
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// (Optional) Only serve static files from /public if you have assets there
// const publicDir = path.join(__dirname, "public");
// app.use(express.static(publicDir));

// Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Restaurant email
const restaurantEmail = "filippo.decristofaro@startlisbon.pt";

// ✅ KEEP-ALIVE endpoint for Render/UptimeRobot
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// Reservation endpoint
app.post("/reserve", async (req, res) => {
  const { name, email, phone, date, time, guests, seating, message } = req.body;

  // Basic guard (prevents empty inserts)
  if (!name || !email || !date || !time || !guests) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  console.log("📦 Full request body:", req.body);
  console.log("👤 Guest email received:", email);

  // Check slot availability (note: add a DB UNIQUE constraint too; see notes below)
  const { data: existing, error: checkError } = await supabase
    .from("reservations")
    .select("*")
    .eq("date", date)
    .eq("time", time);

  if (checkError) return res.status(500).json({ error: "Error checking reservation availability." });
  if (existing && existing.length > 0)
    return res.status(400).json({ error: "Sorry, that time slot is already booked." });

  const guestsInt = parseInt(guests, 10) || 1;

  const { error } = await supabase.from("reservations").insert([
    {
      name,
      email: String(email).trim().toLowerCase(),
      phone,
      date,
      time,
      guests: guestsInt,
      seating,
      message,
    },
  ]);

  if (error) return res.status(500).json({ error: "Something went wrong. Please try again." });

  // Calendar data (local time is fine for most cases)
  const start = dayjs(`${date}T${time}`);
  const end = start.add(2, "hour");
  const formattedStart = start.format("YYYYMMDDTHHmmss"); // e.g., 20250903T153000
  const formattedEnd = end.format("YYYYMMDDTHHmmss");     // e.g., 20250903T173000
  const weekday = start.format("dddd");

  const calendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=Reservation+at+Espaco+Trium&dates=${formattedStart}/${formattedEnd}&details=Reservation+for+${guestsInt}+people+with+${encodeURIComponent(
    name
  )}&location=${encodeURIComponent("Espaco Trium, Cascais")}`;

  // ✅ Make a proper .ics and ATTACH it to the email (works for Apple/Outlook)
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Espaco Trium//Reservations//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@espaco-trium`,
    `DTSTAMP:${dayjs().format("YYYYMMDDTHHmmss")}Z`,
    `DTSTART:${formattedStart}`,
    `DTEND:${formattedEnd}`,
    "SUMMARY:Reservation at Espaco Trium",
    "LOCATION:Espaco Trium, Cascais",
    `DESCRIPTION:Reservation for ${guestsInt} guest(s) with ${name}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const isPortuguese = String(email).toLowerCase().endsWith(".pt") || seating === "fora";

  const guestEmail = {
    from: "noreply@forsitmedia.com", // ✅ make sure this domain is verified in Resend
    to: String(email).trim().toLowerCase(),
    subject: isPortuguese ? "Confirmação de Reserva" : "Reservation Confirmation",
    html: `
      <div style="font-family: sans-serif; font-size: 16px;">
        <p>${isPortuguese ? `Olá ${name},` : `Hello ${name},`}</p>
        <p>
          ${isPortuguese
            ? `Sua reserva foi confirmada para <strong>${guestsInt}</strong> pessoa(s) na <strong>${weekday}</strong>, dia <strong>${date}</strong> às <strong>${time}</strong>.`
            : `Your reservation is confirmed for <strong>${guestsInt}</strong> guest(s) on <strong>${weekday}</strong>, <strong>${date}</strong> at <strong>${time}</strong>.`}
        </p>
        <p>${isPortuguese ? "Local: Espaço Trium, Cascais." : "Location: Espaço Trium, Cascais."}</p>
        <p>📅 <a href="${calendarLink}" target="_blank" style="color:#8c4f30;">
          ${isPortuguese ? "Adicionar ao Google Calendar" : "Add to Google Calendar"}
        </a></p>
        <p>${isPortuguese ? "Obrigado!" : "Thank you!"}</p>
      </div>
    `,
    // ✅ Attach the ICS so Apple/Outlook users can add it in one tap
    attachments: [
      {
        filename: `reservation-${formattedStart}.ics`,
        content: icsContent,
        contentType: "text/calendar",
      },
    ],
  };

  const restaurantEmailContent = {
    from: "noreply@forsitmedia.com",
    to: restaurantEmail,
    subject: "📥 New Reservation Received",
    html: `
      <div style="font-family: sans-serif; font-size: 16px;">
        <p><strong>New Reservation</strong></p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone || "—"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Guests:</strong> ${guestsInt}</p>
        <p><strong>Seating:</strong> ${seating || "—"}</p>
        <p><strong>Note:</strong> ${message || "None"}</p>
        <p>📅 <a href="${calendarLink}" target="_blank" style="color:#8c4f30;">Add to Calendar</a></p>
      </div>
    `,
  };

  try {
    await resend.emails.send(guestEmail);
    console.log("✅ Guest confirmation email sent to:", guestEmail.to);
    await resend.emails.send(restaurantEmailContent);
    console.log("✅ Restaurant notification sent to:", restaurantEmail);
    res.json({ success: true, message: "Reservation and emails sent!" });
  } catch (emailError) {
    console.error("Email error:", emailError);
    res.status(500).json({ error: "Reservation saved, but email failed to send." });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
