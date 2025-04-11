const fs = require("fs");
const path = require("path");

// Create the uploads directory structure
const uploadsDir = path.join(process.cwd(), "public", "uploads", "backgrounds");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory structure");
} else {
  console.log("Uploads directory already exists");
}
