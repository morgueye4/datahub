import { Hono } from "https://deno.land/x/hono@v3.11.11/mod.ts";
import tasksRouter from "./routes/tasks.ts";
import submissionsRouter from "./routes/submissions.ts";
import reviewsRouter from "./routes/reviews.ts";
import usersRouter from "./routes/users.ts";
import faucetRouter from "./routes/faucet.ts";

// Create a new router for Lighthouse integration
const lighthouseRouter = new Hono();

// Get Lighthouse API key
lighthouseRouter.get("/api-key", (c) => {
  return c.json({
    success: true,
    data: {
      apiKey: "6f600731.21f696ed13594bb6b2d33c5c5f9690d3"
    }
  });
});
const app = new Hono();

// Custom middleware for logging and CORS
app.use("*", async (c, next) => {
  // Log the request
  console.log(`${new Date().toISOString()} - ${c.req.method} ${c.req.url}`);

  // Handle preflight requests
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Add CORS headers to all responses
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  await next();
});

// Routes
app.get("/", (c) => {
  return c.json({
    message: "Welcome to the Decentralized Data Labeling API"
  });
});


// Routes
app.get("/", (c) => {
  return c.json({
    message: "Welcome to the Decentralized Data Labeling API (Deno KV Edition)",
    version: "3.0.0"
  });
});

// Register route handlers
app.route("/tasks", tasksRouter);
app.route("/submissions", submissionsRouter);
app.route("/reviews", reviewsRouter);
app.route("/users", usersRouter);
app.route("/faucet", faucetRouter);
app.route("/lighthouse", lighthouseRouter);
// app.route("/datasets", datasetsRouter);
// app.route("/proposals", proposalsRouter);

// Start the server
const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Server running on http://localhost:${port}`);
console.log("Using Deno KV for data storage");
console.log("Run with: deno run --allow-net --allow-env --allow-read --allow-write --allow-ffi --unstable-kv main_kv.ts");
Deno.serve({ port }, app.fetch);
