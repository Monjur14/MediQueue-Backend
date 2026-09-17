const express = require("express");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Route
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running 3",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
