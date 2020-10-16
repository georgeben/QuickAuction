const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const randomString = require("randomstring");
const http = require("http");

let price = 1;
let clients = [];
const port = 3000;
let timer;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/bid", (req, res) => {
  const bidPrice = Number(req.body.price);
  if (!bidPrice) {
    return res.status(400).json({
      error: "Please enter a valid price",
    });
  }
  if (bidPrice <= price) {
    return res.status(400).json({
      error: "Please enter a higher price",
    });
  }
  price = bidPrice;
  res.status(200).json({
    message: "Successfully received bid",
  });
  clearInterval(timer);
  startTimer();
  return broadcastEvent(
    JSON.stringify({
      type: "price",
      value: price,
    }),
  );
});

app.get("/events", (req, res) => {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
  res.writeHead(200, headers);
  const data = JSON.stringify({
    type: "price",
    value: price,
  });
  res.write(`data: ${data} \n\n`);

  const clientId = randomString.generate(16);
  const client = {
    id: clientId,
    res,
  };
  clients.push(client);

  req.on("close", () => {
    console.log(`Client #${client.id} connection closed`);
    clients = clients.filter((client) => client.id !== clientId);
  });
});

function broadcastEvent(data) {
  clients.forEach((c) => {
    c.res.write("data: " + data + "\n\n");
  });
}

function startTimer() {
  let timeLeft = 20;

  timer = setInterval(() => {
    if (timeLeft < 0) {
      return clearInterval(timer);
    }
    clients.forEach((c) => {
      let data = JSON.stringify({
        type: "timer",
        value: timeLeft,
      });
      c.res.write("data: " + data + "\n\n");
    });
    timeLeft -= 1;
  }, 1000);
}

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});
