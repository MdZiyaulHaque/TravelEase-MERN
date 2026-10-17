
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/database");

const PORT = Number(process.env.PORT) || 8000;
const HOST = "0.0.0.0";

// ========================================
// START SERVER
// ========================================
async function start() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express Server
    app.listen(PORT, HOST, () => {
      console.log("=================================");
      console.log("TravelEase Backend Started");
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Server listening on port ${PORT}`);
      console.log("=================================");
    });

    // ========================================
    // OPTIONAL TRIP REMINDERS
    // ========================================
    // For production, use a dedicated scheduler
    // or a single worker to prevent duplicate jobs.

    if (process.env.ENABLE_TRIP_REMINDERS === "true") {
      const runReminders = async () => {
        try {
          await require("./services/notifications")
            .processReminders({ daysAhead: 1 });

          console.log("Trip reminder scan completed");
        } catch (error) {
          console.error(
            "Reminder scan failed:",
            error.message
          );
        }
      };

      setTimeout(runReminders, 15000);

      setInterval(
        runReminders,
        24 * 60 * 60 * 1000
      );
    }
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
}

start();
