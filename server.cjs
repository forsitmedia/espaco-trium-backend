const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const dotenv = require("dotenv");
const dayjs = require("dayjs");
const path = require("path");

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
  const calendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=Reservation+at+Espaco+Trium&dates=${formattedStart}/${formattedEnd}&details=Reservation+for+${guests}+people+with+${name}&location=Espaco+Trium,+Cascais`;

  const isPortuguese = email.endsWith(".pt") || seating === "fora";

  const guestEmail = {
  from: "noreply@forsitmedia.com",
  to: String(email).trim().toLowerCase(),
  subject: isPortuguese ? "Detalhes da sua reserva" : "Your booking details",
  html: `
    <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5;">
      <p>${isPortuguese ? `Olá ${name},` : `Hello ${name},`}</p>
      <p>${isPortuguese
        ? `Recebemos sua solicitação de reserva no Espaço Trium, em Cascais.`
        : `We’ve received your reservation request for Espaço Trium in Cascais.`}</p>
      <p>${isPortuguese
        ? `Aqui estão os detalhes:`
        : `Here are the details:`}</p>
      <ul>
        <li>${isPortuguese ? "Data" : "Date"}: ${date}</li>
        <li>${isPortuguese ? "Hora" : "Time"}: ${time}</li>
        <li>${isPortuguese ? "Número de pessoas" : "Number of guests"}: ${guests}</li>
      </ul>
      <p>${isPortuguese ? "Endereço: Espaço Trium, Cascais." : "Location: Espaço Trium, Cascais."}</p>
      <p>
        ${isPortuguese ? "Adicionar ao seu calendário:" : "Add to your calendar:"}
        <br />
        <a href="${calendarLink}" target="_blank">${calendarLink}</a>
      </p>
      <p>${isPortuguese ? "Agradecemos o seu contato!" : "Thank you for booking with us!"}</p>
    </div>
  `,
};

const restaurantEmailContent = {
  from: "noreply@forsitmedia.com",
  to: restaurantEmail,
  subject: "New booking information",
  html: `
    <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5;">
      <p>Reservation received with the following details:</p>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Phone:</strong> ${phone}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Guests:</strong> ${guests}</li>
        <li><strong>Seating Preference:</strong> ${seating}</li>
        <li><strong>Message:</strong> ${message || "None"}</li>
      </ul>
      <p>Calendar link: <a href="${calendarLink}" target="_blank">${calendarLink}</a></p>
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
