document.addEventListener("DOMContentLoaded", (event) => {
  console.log("Script loaded");

  const circle = document.querySelector(".circle");
  const point = document.getElementById("draggable-point");
  const percentageDisplay = document.getElementById("percentage");
  let radius = circle ? circle.clientWidth / 2 : 0;
  let pointRadius = point ? point.clientWidth / 2 : 0;
  let circleCenter = circle
    ? {
        x: circle.getBoundingClientRect().left + radius,
        y: circle.getBoundingClientRect().top + radius,
      }
    : { x: 0, y: 0 };

  console.log("Circle:", circle);
  console.log("Point:", point);
  console.log("Percentage Display:", percentageDisplay);

  let isDragging = false;
  let lastMouseMoveTime = 0;
  const throttleInterval = 16; // Approx 60fps

  function updateDimensions() {
    radius = circle.clientWidth / 2;
    pointRadius = point.clientWidth / 2;
    circleCenter = {
      x: circle.getBoundingClientRect().left + radius,
      y: circle.getBoundingClientRect().top + radius,
    };
  }

  if (point) {
    point.addEventListener("mousedown", (e) => {
      isDragging = true;
      updateDimensions();
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  function onMouseMove(e) {
    const currentTime = Date.now();
    if (!isDragging || currentTime - lastMouseMoveTime < throttleInterval)
      return;
    lastMouseMoveTime = currentTime;

    const x = e.clientX - circleCenter.x;
    const y = e.clientY - circleCenter.y;
    const angle = Math.atan2(y, x);
    const adjustedAngle = angle < -Math.PI / 2 ? angle + 2 * Math.PI : angle;

    const newX =
      circleCenter.x + Math.cos(adjustedAngle) * (radius - pointRadius); // Adjust to keep center of point on the border
    const newY =
      circleCenter.y + Math.sin(adjustedAngle) * (radius - pointRadius); // Adjust to keep center of point on the border

    point.style.left = `${newX - circleCenter.x + radius}px`;
    point.style.top = `${newY - circleCenter.y + radius}px`;

    const percentage = (
      ((adjustedAngle + Math.PI / 2) / (2 * Math.PI)) *
      100
    ).toFixed(2);
    percentageDisplay.textContent = `${percentage}%`;
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }

  document
    .getElementById("comfiletransfer")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const form = event.target;
      const formData = new FormData(form);

      // Use fetch to send the form data as JSON
      fetch("/sendViaCOM", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData.entries())),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          // Update the HTML to display the response
          const responseDiv = document.getElementById("response");
          responseDiv.innerHTML = JSON.stringify(data, null, 2); // Beautify JSON
          console.log("Response data:", data);
        })
        .catch((error) => {
          console.error("Error:", error);
          const responseDiv = document.getElementById("response");
          responseDiv.innerHTML = JSON.stringify(error, null, 2); // Beautify JSON
        });
    });

  // Save button click event handler
  document.getElementById("saveBtn").addEventListener("click", () => {
    fetch("/save")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.text();
      })
      .then((data) => {
        console.log(data); // Log success message
        alert("File saved to pendrive successfully.");
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
        alert("An error occurred while saving the file to pendrive.");
      });
  });

  // Event listener for cell clicks
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      const color = cell.getAttribute("data-color");
      let index = parseInt(cell.getAttribute("data-index"));

      // If the cell is already colored, reset it to gray and reset the index.
      if (
        cell.style.backgroundColor !== "rgb(221, 221, 221)" &&
        cell.style.backgroundColor !== ""
      ) {
        cell.style.backgroundColor = "#ddd";
        cell.setAttribute("data-index", "0");
      } else {
        // If the cell is gray, color it.
        let shade;
        if (color === "green") {
          shade = `rgb(0, ${255 - index * 50}, 0)`;
        } else if (color === "red") {
          shade = `rgb(${255 - index * 50}, 0, 0)`;
        }
        cell.style.backgroundColor = shade;
        // Increment the index for the next click.
        if (index < 4) {
          cell.setAttribute("data-index", index + 1);
        }
      }
    });
  });

  // Function to fetch the latest confirmation status
  let confirmationTimeout;
  const fetchConfirmationStatus = () => {
    fetch("/getConfirmationStatus")
      .then((response) => response.json())
      .then((data) => {
        const confirmationStatusElement =
          document.getElementById("confirmationStatus");
        console.log(
          "Fetched confirmation status element:",
          confirmationStatusElement
        );
        if (confirmationStatusElement) {
          confirmationStatusElement.textContent = data.confirmationStatus;
          console.log("Confirmation status updated:", data.confirmationStatus);

          // Clear the previous timeout and set a new one
          clearTimeout(confirmationTimeout);
          confirmationTimeout = setTimeout(() => {
            confirmationStatusElement.textContent =
              "Waiting for confirmation...";
            console.log(
              "No new confirmation received, status reset to waiting."
            );
          }, 10000); // Reset status after 10 seconds of no new confirmation
        }
      })
      .catch((error) => {
        console.error("Error fetching confirmation status:", error);
      });
  };

  // Fetch the confirmation status every 2 seconds
  setInterval(fetchConfirmationStatus, 2000);

  document
    .getElementById("saveControlPanelBtn")
    .addEventListener("click", () => {
      const powerCells = document.querySelectorAll("#row1 .cell");
      const heatCells = document.querySelectorAll("#row2 .cell");
      const percentage = document.getElementById("percentage").textContent;

      const powerData = Array.from(powerCells)
        .filter(
          (cell) =>
            cell.style.backgroundColor !== "rgb(221, 221, 221)" &&
            cell.style.backgroundColor !== ""
        )
        .map((cell) => cell.getAttribute("data-index"));

      const heatData = Array.from(heatCells)
        .filter(
          (cell) =>
            cell.style.backgroundColor !== "rgb(221, 221, 221)" &&
            cell.style.backgroundColor !== ""
        )
        .map((cell) => cell.getAttribute("data-index"));

      const dataToSave = {
        circle: percentage,
        power: powerData,
        heat: heatData,
      };

      fetch("/saveControlPanelData", {
        method: "POST",
        body: JSON.stringify(dataToSave),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          console.log("Control panel data saved:", data);
          alert("Control panel data saved successfully.");
          window.location.reload(); // Reload the page to refresh JSON data display
        })
        .catch((error) => {
          console.error("Error saving control panel data:", error);
          alert("An error occurred while saving control panel data.");
        });
    });

  function capitalizeComPort() {
    var comPortInput = document.getElementById("com-port");
    comPortInput.value = comPortInput.value.toUpperCase();
  }
});
