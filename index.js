import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path, { dirname } from "path";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { fileURLToPath } from "url";

const app = express();
const port_host = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = "./data/posts.json"; // Path to the file to be sent
let confirmationStatus = "Waiting for confirmation...";

app.use(express.static(path.join(__dirname, "public"))); // Allow static files
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

let jsonData = {};
let serialPort;
let parser;

// Read initial JSON data
fs.readFile(filePath, (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }
  try {
    jsonData = JSON.parse(data);
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }
});

// ------------------ global functions -------------------

// serial port init
const setupSerialPort = (com, baudrate) => {
  serialPort = new SerialPort({ path: com, baudRate: baudrate });
  parser = serialPort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  serialPort.on("error", (err) => {
    console.error("Error opening serial port:", err.message);
  });

  serialPort.on("open", () => {
    console.log("Serial port opened.");
  });

  // Handle data received from the ESP32
  parser.on("data", (data) => {
    console.log("Received:", data);
    // Update confirmation status based on received data
    confirmationStatus = data;
  });
};

// Route to render the index page with JSON data
app.get("/", (req, res) => {
  res.render("index", {
    jsonData: jsonData,
    confirmationStatus: confirmationStatus,
  });
});

app.get("/getConfirmationStatus", (req, res) => {
  res.json({ confirmationStatus });
});

// Route to handle sending data via COM port
app.post("/sendViaCOM", (req, res) => {
  try {
    const com = req.body["com-port"];
    const baudrateString = req.body["baudrate"];
    const baudrateNumber = parseInt(baudrateString, 10); // 10 specifies the radix (base) of the number

    if (!serialPort || !serialPort.isOpen) {
      setupSerialPort(com, baudrateNumber);
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error("Error reading file:", err.message);
        return res
          .status(500)
          .json({ error: "Error reading file: " + err.message });
      }

      serialPort.write(data, (err) => {
        if (err) {
          console.error("Error writing to port:", err.message);
          return res.status(500).json({
            error: "Error sending the file via serial port: " + err.message,
          });
        }
        console.log("File sent successfully.");
        res.json({ success: "File sent successfully." });
      });
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Error: " + error.message });
  }
});

app.post("/submit", (req, res) => {
  const data = req.body["data"];
  const currentDate = new Date().toISOString();

  if (jsonData.hasOwnProperty(data)) {
    res.send(
      "<script>alert('The post with title \"" +
        data +
        "\" already exists. Please provide a different title.'); window.location.href = '/';</script>"
    );
    return;
  }

  jsonData[currentDate] = data;

  fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      console.error("Error writing file:", err);
      res.status(500).send("Error saving post data.");
      return;
    }
    console.log("Post data saved successfully.");
    res.redirect("/");
  });
});

app.post("/saveControlPanelData", (req, res) => {
  const controlPanelData = req.body;
  const currentDate = new Date().toISOString();
  jsonData[currentDate] = controlPanelData;

  fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      console.error("Error writing file:", err);
      return res
        .status(500)
        .json({ error: "Error saving control panel data." });
    }
    console.log("Control panel data saved successfully.");
    res.json({ success: "Control panel data saved successfully." });
  });
});

app.get("/save", (req, res) => {
  const destFilePath = "E:/posts.json"; // Replace with the actual path to your pendrive

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return res.status(500).send("Error reading file.");
    }

    fs.writeFile(destFilePath, data, (err) => {
      if (err) {
        console.error("Error writing file:", err);
        return res.status(500).send("Error saving file to pendrive.");
      }
      res.send("File saved to pendrive successfully.");
    });
  });
});

app.listen(port_host, () => {
  console.log(`Listening on port ${port_host}`);
});
