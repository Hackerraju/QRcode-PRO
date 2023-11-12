const express = require("express");
const qrCode = require("qrcode");
const path = require("path");
const mongoose = require("mongoose");
const { promisify } = require("util");
require("dotenv").config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000; // Use the PORT environment variable or default to 3000

app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Define QR code schema
const qrCodeSchema = new mongoose.Schema({
  text: String,
  height: Number,
  width: Number,
  colorDark: String,
  colorLight: String,
  bgColor: String,
  widgetSize: Number,
  textInside: String,
  filename: String,
  createdAt: { type: Date, default: Date.now },
});

const QRCode = mongoose.model("QRCode", qrCodeSchema);

const writeFileAsync = promisify(require("fs").writeFile);

app.post("/generate", async (req, res) => {
  try {
    const {
      text = "",
      height = 300,
      width = 300,
      colorDark = "#000000",
      colorLight = "#ffffff",
      bgColor = "#ffffff",
      widgetSize = 4,
      textInside = "",
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "");

    const filename = `qrcode_${timestamp}.png`;
    const filePath = path.join(__dirname, "public", filename);

    await qrCode.toFile(filePath, text, {
      width: width,
      height: height,
      color: {
        dark: colorDark,
        light: colorLight,
      },
      background: bgColor,
      margin: 1,
      scale: widgetSize,
      text: textInside,
      version: 5,
    });

    const qrCodeData = new QRCode({
      text,
      height,
      width,
      colorDark,
      colorLight,
      bgColor,
      widgetSize,
      textInside,
      filename,
    });

    const savedQRCode = await qrCodeData.save();

    const response = {
      success: true,
      message: "QR Code generated and saved successfully",
      id: savedQRCode._id,
      filename,
      createdAt: savedQRCode.createdAt,
      availableAt: `http://localhost:${port}/qrcodes/${filename}`,
      textInside,
      height,
      width,
      colorDark,
      colorLight,
      bgColor,
      widgetSize,
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/qrcodes/all", async (req, res) => {
  try {
    // Retrieve all QR code data from MongoDB
    const allQRCodes = await QRCode.find();

    // Check if there are no QR codes in the database
    if (!allQRCodes || allQRCodes.length === 0) {
      return res.status(404).json({ error: "No QR Codes found" });
    }

    // Map the response to only include necessary information
    const qrCodesResponse = allQRCodes.map((qrCodeData) => {
      return {
        id: qrCodeData._id,
        filename: qrCodeData.filename,
        createdAt: qrCodeData.createdAt,
        availableAt: `http://localhost:${port}/qrcodes/${qrCodeData.filename}`,
        textInside: qrCodeData.textInside,
        height: qrCodeData.height,
        width: qrCodeData.width,
        colorDark: qrCodeData.colorDark,
        colorLight: qrCodeData.colorLight,
        bgColor: qrCodeData.bgColor,
        widgetSize: qrCodeData.widgetSize,
      };
    });

    res.json(qrCodesResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/qrcodes/byId/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Find the QR code data in MongoDB by its ID
    const qrCodeData = await QRCode.findById(id);

    if (!qrCodeData) {
      return res.status(404).json({ error: "QR Code not found" });
    }

    // Return the specific QR code data
    const qrCodeResponse = {
      id: qrCodeData._id,
      filename: qrCodeData.filename,
      createdAt: qrCodeData.createdAt,
      availableAt: `http://localhost:${port}/qrcodes/${qrCodeData.filename}`,
      textInside: qrCodeData.textInside,
      height: qrCodeData.height,
      width: qrCodeData.width,
      colorDark: qrCodeData.colorDark,
      colorLight: qrCodeData.colorLight,
      bgColor: qrCodeData.bgColor,
      widgetSize: qrCodeData.widgetSize,
    };

    res.json(qrCodeResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on Port: ${port}`);
});
