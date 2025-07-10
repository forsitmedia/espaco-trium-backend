const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const dotenv = require("dotenv");
const dayjs = require("dayjs");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
const port = 3000;

app.use(express.static(__dirname));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Restaurant email
const restaurantEmail = "filippo.decristofaro@startlisbon.pt";

// Reservation endpoint here
app.post("/reserve", async (req, res) => {
  const { name, email, phone, date, time, guests, seating, message } = req.body;

  console.log("📦 Full request body:", req.body);
  console.log("👤 Guest email received:", email);

  const { data: existing, error: checkError } = await supabase
    .from("reservations")
    .select("*")
    .eq("date", date)
    .eq("time", time);

  if (checkError) return res.status(500).json({ error: "Error checking reservation availability." });
  if (existing && existing.length > 0)
    return res.status(400).json({ error: "Sorry, that time slot is already booked." });

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

  if (error) return res.status(500).json({ error: "Something went wrong. Please try again." });

  const start = dayjs(`${date}T${time}`);
  const end = start.add(2, "hour");
  const formattedStart = start.format("YYYYMMDDTHHmmss");
  const formattedEnd = end.format("YYYYMMDDTHHmmss");
  const weekday = start.format("dddd");
  const calendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=Reservation+at+Espaco+Trium&dates=${formattedStart}/${formattedEnd}&details=Reservation+for+${guests}+people+with+${name}&location=Espaco+Trium,+Cascais`;

  // Create .ics calendar content for Apple
  const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Reservation at Espaco Trium\nDTSTART:${formattedStart}\nDTEND:${formattedEnd}\nLOCATION:Espaco Trium, Cascais\nDESCRIPTION:Reservation for ${guests} guest(s) with ${name}\nEND:VEVENT\nEND:VCALENDAR`;
  const icsFileName = `reservation-${formattedStart}.ics`;
  const icsFilePath = path.join(__dirname, "public", "calendar", icsFileName);
  fs.mkdirSync(path.dirname(icsFilePath), { recursive: true });
  fs.writeFileSync(icsFilePath, icsContent);

  const isPortuguese = email.endsWith(".pt") || seating === "fora";

  const guestEmail = {
    from: "noreply@forsitmedia.com",
    to: String(email).trim().toLowerCase(),
    subject: isPortuguese ? "Confirmação de Reserva" : "Reservation Confirmation",
    html: `
      <div style="font-family: sans-serif; font-size: 16px;">
        <p>${isPortuguese ? `Olá ${name},` : `Hello ${name},`}</p>
        <p>
          ${isPortuguese
            ? `Sua reserva foi confirmada para <strong>${guests}</strong> pessoa(s) na <strong>${weekday}</strong>, dia <strong>${date}</strong> às <strong>${time}</strong>.`
            : `Your reservation is confirmed for <strong>${guests}</strong> guest(s) on <strong>${weekday}</strong>, <strong>${date}</strong> at <strong>${time}</strong>.`}
        </p>
        <p>${isPortuguese ? `Local: Espaço Trium, Cascais.` : `Location: Espaço Trium, Cascais.`}</p>
        <p>
          📅 <a href="${calendarLink}" target="_blank" style="color:#8c4f30;">
            ${isPortuguese ? "Adicionar ao Google Calendar" : "Add to Google Calendar"}
          </a>
        </p>
      <p>
  📎 <a href="https://raw.githubusercontent.com/forsitmedia/espaco-trium-website/slim-push/calendar/reservation.ics" target="_blank" style="color:#8c4f30;">
    ${isPortuguese ? "Adicionar ao Apple / Outlook Calendário" : "Add to Apple / Outlook Calendar"}
  </a>
</p>

${icsFileName}" target="_blank" style="color:#8c4f30;">
            ${isPortuguese ? "Adicionar ao Calendário Apple / Outlook" : "Add to Apple / Outlook Calendar"}
          </a>
        </p>
        <p>${isPortuguese ? "Obrigado!" : "Thank you!"}</p>
      </div>
    `,
  };

  const restaurantEmailContent = {
    from: "noreply@forsitmedia.com",
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