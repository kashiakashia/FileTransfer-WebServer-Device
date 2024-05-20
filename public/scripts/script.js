document.addEventListener("DOMContentLoaded", (event) => {
  const circle = document.querySelector(".circle");
  const point = document.getElementById("draggable-point");
  const percentageDisplay = document.getElementById("percentage");
  const radius = circle.clientWidth / 2;
  const pointRadius = point.clientWidth / 2; // Radius of the point itself
  const circleCenter = {
    x: circle.getBoundingClientRect().left + radius,
    y: circle.getBoundingClientRect().top + radius,
  };

  let isDragging = false;

  point.addEventListener("mousedown", (e) => {
    isDragging = true;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

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
        })
        .catch((error) => {
          console.error("Error:", error);
          const responseDiv = document.getElementById("response");
          responseDiv.innerHTML = JSON.stringify(error, null, 2); // Beautify JSON
        });
    });

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

  function capitalizeComPort() {
    var comPortInput = document.getElementById("com-port");
    comPortInput.value = comPortInput.value.toUpperCase();
  }

  function onMouseMove(e) {
    if (!isDragging) return;

    const x = e.clientX - circleCenter.x;
    const y = e.clientY - circleCenter.y;
    const angle = Math.atan2(y, x);
    const adjustedAngle = angle >= 0 ? angle : 2 * Math.PI + angle;

    const newX =
      circleCenter.x + Math.cos(adjustedAngle) * (radius - pointRadius); // Adjust to keep center of point on the border
    const newY =
      circleCenter.y + Math.sin(adjustedAngle) * (radius - pointRadius); // Adjust to keep center of point on the border

    point.style.left = `${newX - pointRadius}px`;
    point.style.top = `${newY - pointRadius}px`;

    const percentage = ((adjustedAngle / (2 * Math.PI)) * 100).toFixed(2);
    percentageDisplay.textContent = `${percentage}%`;
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
});
