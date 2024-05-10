import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { SerialPort } from "serialport";
import fetch from "node-fetch";
import { error } from "console";

const app = express();
const port_host = 3000;

// Path to the file to be sent
const filePath = "./data/posts.json";
// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

let jsonData = {};

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

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index", { jsonData: jsonData });
});

app.post("/sendViaCOM", (req, res) => {
  try {
    const com = req.body["com-port"];
    const baudrateString = req.body["baudrate"];
    const baudrateNumber = parseInt(baudrateString, 10); // 10 specifies the radix (base) of the number

    const port = new SerialPort({
      path: com,
      baudRate: baudrateNumber, // Specify the baud rate
    });
    console.log(com, baudrateNumber);

    port.on("error", (err) => {
      console.error("Error opening serial port:", err.message);
      res.setHeader("Content-Type", "application/json");
      res.json({ error: err.message });
    });

    port.on("open", () => {
      console.log("Serial port opened.");

      // Read the file
      fs.readFile(filePath, (err, data) => {
        if (err) {
          // Handle file reading error
          console.error("Error reading file:", err.message);
          res.status(500).json({ error: "Error reading file: " + err.message });
          return;
        }

        // Send the file contents over the serial port
        port.write(data, (err) => {
          if (err) {
            // Handle port write error
            console.error("Error writing to port:", err.message);
            res.status(500).json({
              error: "Error sending the file via serial port: " + err.message,
            });
            return;
          }
          console.log("File sent successfully.");
          res.json({ success: "File sent successfully." });
        });
      });
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Error: " + error.message });
  }
});

app.post("/submit", (req, res) => {
  const data = req.body["data"];
  const currentDate = new Date().toISOString(); // Generate current date in ISO format

  // Check if the title already exists in jsonData
  if (jsonData.hasOwnProperty(data)) {
    res.send(
      "<script>alert('The post with title \"" +
        data +
        "\" already exists. Please provide a different title.'); window.location.href = '/';</script>"
    );
    return;
  }

  // Update jsonData object
  jsonData[currentDate] = data;

  // Write jsonData to the file
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

// Route for handling the save operation
app.get("/save", (req, res) => {
  const destFilePath = "E:/posts.json"; // Replace with the actual path to your pendrive

  // Read the file from the 'data' directory
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return res.status(500).send("Error reading file.");
    }

    // Write the file to the pendrive
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
