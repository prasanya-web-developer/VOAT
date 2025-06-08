require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: [
    "https://voatnetwork.com",
    "http://localhost:3000",
    "https://voat-network.netlify.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Add a preflight handler for OPTIONS requests
app.options("*", cors(corsOptions));
app.use(bodyParser.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create resumes directory if it doesn't exist
const resumesDir = path.join(__dirname, "uploads/resumes");
if (!fs.existsSync(resumesDir)) {
  fs.mkdirSync(resumesDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const workFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/svg+xml",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/flv",
    "video/webm",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
    return cb(new Error("Only image and video files are allowed!"));
  }
};

const workUpload = multer({
  storage: storage,
  fileFilter: workFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size for videos
  },
});

// Add this line after your resumeUpload definition
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Set up multer for resume uploads
const resumeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/resumes/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const resumeUpload = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected successfully"))
  .catch((err) => console.log(err));

// Update User Schema to include VOAT fields
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  profession: String,
  phone: String, // Add this line
  profileImage: String,
  voatId: { type: String, unique: true, sparse: true },
  voatPoints: { type: Number, default: 0 },
  badge: { type: String, default: "bronze" },
});

const User = mongoose.model("User", UserSchema);

const ServiceSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    pricing: [
      {
        level: { type: String, required: true },
        price: { type: Number, required: true },
        timeFrame: { type: String },
      },
    ],
    videos: [
      {
        url: { type: String },
        thumbnail: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const PortfolioSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String },
    profession: { type: String },
    headline: { type: String },
    workExperience: { type: String },
    about: { type: String },
    email: { type: String },
    profileImage: { type: String },
    coverImage: { type: String },
    portfolioLink: { type: String },
    resumePath: { type: String },
    services: [ServiceSchema],
    // Add this works array for portfolio work samples
    works: [
      {
        url: { type: String },
        thumbnail: { type: String },
        title: { type: String },
        type: { type: String, enum: ["image", "video"], default: "image" },
        serviceName: { type: String },
        uploadedDate: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    submittedDate: {
      type: Date,
      default: Date.now,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

PortfolioSubmissionSchema.pre("save", function (next) {
  this.updatedDate = Date.now();
  next();
});

const PortfolioSubmission = mongoose.model(
  "PortfolioSubmission",
  PortfolioSubmissionSchema
);

// Add this new schema after your existing schemas
const WishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        id: { type: String, required: true },
        serviceId: String,
        service: String,
        price: Number,
        provider: String,
        profileImage: String,
        rating: { type: Number, default: 4.5 },
        addedDate: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Wishlist = mongoose.model("Wishlist", WishlistSchema);

const BookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientProfileImage: { type: String },
    freelancerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    freelancerName: { type: String, required: true },
    freelancerEmail: { type: String, required: true },
    serviceName: { type: String, required: true },
    servicePrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    responseDate: {
      type: Date,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", BookingSchema);

// Signup Route
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password, role, profession, phone } = req.body; // Add phone here

    // Log the request data (without password) for debugging
    console.log("Signup request received:", {
      name,
      email,
      role,
      profession,
      phone,
    }); // Add phone here

    // Validate required fields
    if (!name || !email || !password || !phone) {
      // Add phone validation
      console.log("Missing required fields in signup");
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Generate VOAT ID during signup
    const randomPart = uuidv4().substring(0, 9).toUpperCase();
    const voatId = `VOAT-${randomPart.substring(0, 4)}-${randomPart.substring(
      4,
      8
    )}`;
    console.log(`Generated VOAT ID for new user: ${voatId}`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      profession,
      phone, // Add this line
      voatId,
      voatPoints: 0,
      badge: "bronze",
    });

    const savedUser = await newUser.save();
    console.log(
      `User saved with ID: ${savedUser._id}, VOAT ID: ${savedUser.voatId}`
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        profession: savedUser.profession,
        phone: savedUser.phone, // Add this line
        voatId: savedUser.voatId,
        voatPoints: savedUser.voatPoints,
        badge: savedUser.badge,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message || "Failed to register user",
    });
  }
});

// Login Route
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate VOAT ID if not present
    let wasUpdated = false;
    if (!user.voatId) {
      const randomPart = uuidv4().substring(0, 9).toUpperCase();
      user.voatId = `VOAT-${randomPart.substring(0, 4)}-${randomPart.substring(
        4,
        8
      )}`;
      wasUpdated = true;
      console.log(`Generated VOAT ID during login: ${user.voatId}`); // Debug log
    }

    // Set defaults for other fields if needed
    if (user.voatPoints === undefined) {
      user.voatPoints = 0;
      wasUpdated = true;
    }

    if (!user.badge) {
      user.badge = "bronze";
      wasUpdated = true;
    }

    // Save updates if needed
    if (wasUpdated) {
      await user.save();
      console.log("User updated with VOAT ID during login");
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profession: user.profession,
        phone: user.phone, // Add this line
        profileImage: user.profileImage,
        voatId: user.voatId,
        voatPoints: user.voatPoints,
        badge: user.badge,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update profile route with file upload
app.post(
  "/api/update-profile",
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const {
        name,
        email,
        role,
        profession,
        phone,
        headline,
        userId,
        voatId,
        voatPoints,
        badge,
      } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.name = name || user.name;
      user.email = email || user.email;
      user.role = role || user.role;
      user.profession = profession || headline || user.profession;
      user.phone = phone || user.phone;

      // Update VOAT information if provided
      if (voatId) user.voatId = voatId;
      if (voatPoints !== undefined) user.voatPoints = voatPoints;
      if (badge) user.badge = badge;

      // Improved image handling
      if (req.file) {
        // Clean up old image if it exists and isn't a placeholder
        if (
          user.profileImage &&
          !user.profileImage.includes("api/placeholder") &&
          !user.profileImage.startsWith("http")
        ) {
          try {
            // Remove the leading slash for path resolution
            const oldImagePath = path.join(
              __dirname,
              user.profileImage.replace(/^\/+/, "")
            );

            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
              console.log(`Deleted old profile image: ${oldImagePath}`);
            }
          } catch (err) {
            console.error("Error deleting old profile image:", err);
          }
        }

        // Store path with leading slash for consistency
        user.profileImage = `/uploads/${req.file.filename}`;

        // Also update any portfolio submissions with this new image
        try {
          await PortfolioSubmission.updateMany(
            { userId: user._id },
            { profileImage: user.profileImage }
          );
        } catch (err) {
          console.error(
            "Error updating profile image in portfolio submissions:",
            err
          );
        }
      }

      await user.save();

      // Return full user data with profile image path
      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profession: user.profession,
          phone: user.phone, // Add this line
          profileImage: user.profileImage,
          voatId: user.voatId,
          voatPoints: user.voatPoints,
          badge: user.badge,
        },
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update user VOAT data
app.post("/api/update-user-data", async (req, res) => {
  try {
    const { userId, voatId, voatPoints, badge } = req.body;
    console.log("Update user data request:", req.body); // Debug log

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update VOAT fields if provided
    let wasUpdated = false;

    if (voatId && user.voatId !== voatId) {
      user.voatId = voatId;
      wasUpdated = true;
      console.log(`Updated VOAT ID to: ${voatId}`); // Debug log
    }

    if (voatPoints !== undefined && user.voatPoints !== voatPoints) {
      user.voatPoints = voatPoints;
      wasUpdated = true;
    }

    if (badge && user.badge !== badge) {
      user.badge = badge;
      wasUpdated = true;
    }

    if (wasUpdated) {
      const updatedUser = await user.save();
      console.log("User updated successfully, VOAT ID:", updatedUser.voatId); // Debug log
    } else {
      console.log("No changes detected, user not updated");
    }

    res.status(200).json({
      message: wasUpdated
        ? "User data updated successfully"
        : "No changes required",
      user: {
        id: user._id,
        voatId: user.voatId,
        voatPoints: user.voatPoints,
        badge: user.badge,
      },
    });
  } catch (error) {
    console.error("User data update error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

app.get("/api/debug/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return all user fields to see what's actually stored
    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profession: user.profession,
      phone: user.phone, // Check if this is null/undefined
      profileImage: user.profileImage,
      voatId: user.voatId,
      voatPoints: user.voatPoints,
      badge: user.badge,
      // Show the raw document
      rawUser: user.toObject(),
    });
  } catch (error) {
    console.error("Debug user fetch error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/status", (req, res) => {
  res.status(200).json({
    status: "online",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Improved test-connection endpoint
app.post("/api/test-connection", (req, res) => {
  console.log("Test connection request received from:", req.headers.origin);
  res.status(200).json({
    status: "success",
    message: "Connection test successful",
    server: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

// Updated /api/portfolio endpoint to handle both headline and profession fields
app.post(
  "/api/portfolio",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        userId,
        name,
        profession,
        headline,
        workExperience,
        about,
        email,
        portfolioLink,
        isNewSubmission,
        service,
      } = req.body;

      // Validate essential fields
      if (!name || !profession || !email) {
        return res.status(400).json({
          success: false,
          message: "Name, profession, and email are required",
        });
      }

      // Get file paths if files were uploaded
      const profileImageFile = req.files?.profileImage?.[0];
      const coverImageFile = req.files?.coverImage?.[0];

      // Prepare update data
      const portfolioData = {
        name,
        profession,
        headline, // Store headline explicitly
        workExperience,
        about,
        email,
        portfolioLink,
      };

      // Add file paths if uploaded
      if (profileImageFile) {
        portfolioData.profileImage = `/uploads/${profileImageFile.filename}`;
      }

      if (coverImageFile) {
        portfolioData.coverImage = `/uploads/${coverImageFile.filename}`;
      }

      // Set status to pending for new submissions
      // This ensures all new portfolio submissions go to admin for review
      if (isNewSubmission === "true") {
        portfolioData.status = "pending";
        portfolioData.submittedDate = new Date();
      }

      // Copy user's profile image if they have one and no new profile image was uploaded
      if (userId && !profileImageFile) {
        const user = await User.findById(userId);
        if (user && user.profileImage) {
          portfolioData.profileImage = user.profileImage;
        }
      }

      // Handle service data if provided
      let serviceData = null;
      if (service) {
        try {
          serviceData = JSON.parse(service);
          console.log("Parsed service data:", serviceData);
        } catch (err) {
          console.error("Error parsing service JSON:", err);
        }
      }

      // Find and update, or create new if doesn't exist
      let portfolio;
      if (userId) {
        // For logged-in users, we can update existing or create new
        if (isNewSubmission === "true") {
          // If we have a service to add and it's a new submission
          if (serviceData) {
            const newService = {
              name: serviceData.name,
              description: serviceData.description,
              pricing: serviceData.pricing || [],
            };

            // Find the existing portfolio first to check if it exists
            const existingPortfolio = await PortfolioSubmission.findOne({
              userId,
            });

            if (existingPortfolio) {
              // If portfolio exists, check for duplicate services
              if (!existingPortfolio.services) {
                existingPortfolio.services = [];
              }

              // Check if a service with this name already exists
              const existingServiceIndex = existingPortfolio.services.findIndex(
                (service) => service.name === newService.name
              );

              if (existingServiceIndex >= 0) {
                // Update existing service instead of adding a duplicate
                existingPortfolio.services[existingServiceIndex] = newService;
              } else {
                // Add new service only if it doesn't exist
                existingPortfolio.services.push(newService);
              }

              existingPortfolio.status = "pending";
              existingPortfolio.submittedDate = new Date();

              // Update other portfolio fields
              Object.assign(existingPortfolio, portfolioData);

              // Save the updated portfolio
              portfolio = await existingPortfolio.save();
            } else {
              // Create a new portfolio with the service
              portfolio = new PortfolioSubmission({
                ...portfolioData,
                userId,
                services: [newService],
                status: "pending",
                submittedDate: new Date(),
              });

              await portfolio.save();
            }
          } else {
            // No service data, just update or create the portfolio
            portfolio = await PortfolioSubmission.findOneAndUpdate(
              { userId },
              {
                ...portfolioData,
                status: "pending",
                submittedDate: new Date(),
              },
              { upsert: true, new: true }
            );
          }
        } else {
          // Normal update - don't change status
          portfolio = await PortfolioSubmission.findOneAndUpdate(
            { userId },
            portfolioData,
            { upsert: true, new: true }
          );
        }
      } else {
        // For non-logged in users, always create new submission
        if (serviceData) {
          // Include the service if provided
          portfolio = new PortfolioSubmission({
            ...portfolioData,
            services: [
              {
                name: serviceData.name,
                description: serviceData.description,
                pricing: serviceData.pricing || [],
              },
            ],
            status: "pending",
            submittedDate: new Date(),
          });
        } else {
          portfolio = new PortfolioSubmission({
            ...portfolioData,
            status: "pending",
            submittedDate: new Date(),
          });
        }
        await portfolio.save();
      }

      res.status(200).json({
        success: true,
        message:
          isNewSubmission === "true"
            ? "Portfolio submitted successfully and pending admin approval"
            : "Portfolio updated successfully",
        portfolio: portfolio,
      });
    } catch (error) {
      console.error("Portfolio operation error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process portfolio",
      });
    }
  }
);

app.get("/api/portfolio-status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find the user's portfolio submission
    const portfolio = await PortfolioSubmission.findOne({ userId });

    if (!portfolio) {
      return res
        .status(200)
        .json({ status: null, message: "No portfolio found" });
    }

    // Return the portfolio status
    res.status(200).json({
      status: portfolio.status,
      message: `Portfolio found with status: ${portfolio.status}`,
    });
  } catch (error) {
    console.error("Error fetching portfolio status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/admin/portfolio-submissions", async (req, res) => {
  try {
    // Get all submissions sorted by date (newest first)
    const submissions = await PortfolioSubmission.find()
      .sort({ submittedDate: -1 })
      .populate("userId", "profileImage"); // Populate user profile image if available

    // Format submissions to include proper fields
    const formattedSubmissions = submissions.map((submission) => {
      // Convert Mongoose document to plain JavaScript object
      const sub = submission.toObject();

      // Use user's profile image if available and submission doesn't have one
      if (sub.userId && sub.userId.profileImage && !sub.profileImage) {
        sub.profileImage = sub.userId.profileImage;
      }

      // Make sure services are properly included
      if (sub.services) {
        // Ensure services array is properly formatted and accessible
        console.log("Original services for submission:", sub._id, sub.services);
      } else {
        console.log("No services found for submission:", sub._id);
        sub.services = []; // Ensure services is at least an empty array
      }

      return sub;
    });

    // Log for debugging
    console.log(
      "Sending portfolio submissions to admin panel:",
      formattedSubmissions.map((s) => ({
        id: s._id || s.id,
        name: s.name,
        hasServices: s.services && s.services.length > 0,
      }))
    );

    res.status(200).json(formattedSubmissions);
  } catch (error) {
    console.error("Error fetching portfolio submissions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/admin/portfolio-submission/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the portfolio submission by ID
    const submission = await PortfolioSubmission.findById(id);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Clean up any potential service duplicates before sending
    if (submission.services && Array.isArray(submission.services)) {
      // Create a Map to store unique services by name
      const uniqueServicesMap = new Map();

      submission.services.forEach((service) => {
        // Use service name as unique key and only keep the latest version
        if (service.name) {
          uniqueServicesMap.set(service.name, service);
        }
      });

      // Replace the services array with de-duplicated services
      submission.services = Array.from(uniqueServicesMap.values());

      // Save the de-duplicated services back to the database
      await submission.save();
    }

    // Return the cleaned submission
    res.status(200).json(submission);
  } catch (error) {
    console.error("Error fetching portfolio submission:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Consolidated status update route
app.put("/api/admin/portfolio-submissions/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Find the submission first
    const submission = await PortfolioSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Sync profile image with user if available
    if (submission.userId) {
      try {
        const user = await User.findById(submission.userId);
        if (user && user.profileImage) {
          submission.profileImage = user.profileImage;
        }
      } catch (err) {
        console.error("Error syncing user profile image:", err);
        // Continue with update even if image sync fails
      }
    }

    // Update status and save
    submission.status = status;
    submission.updatedDate = new Date();
    await submission.save();

    // Send notification to user (you could implement email notification here)
    console.log(`Portfolio submission ${id} status updated to ${status}`);

    res.status(200).json(submission);
  } catch (error) {
    console.error("Error updating submission status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Helper route to check if user has an existing portfolio
app.get("/api/portfolio/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const portfolio = await PortfolioSubmission.findOne({ userId });

    res.status(200).json({
      hasPortfolio: !!portfolio,
      portfolio: portfolio,
    });
  } catch (error) {
    console.error("Error checking portfolio existence:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update the /api/portfolios endpoint

app.get("/api/portfolios", async (req, res) => {
  try {
    const approvedPortfolios = await PortfolioSubmission.find({
      status: "approved",
    }).sort({ submittedDate: -1 });
    console.log("in /api/portfolios");
    const portfolios = await Promise.all(
      approvedPortfolios.map(async (portfolio) => {
        const user = await User.findById(portfolio.userId);
        const voatId = user?.voatId || null;

        return {
          _id: portfolio._id,
          id: portfolio.id,
          userId: portfolio.userId,
          uservoatId: voatId,
          name: portfolio.name,
          email: portfolio.email,
          workExperience: portfolio.workExperience,
          profession: portfolio.profession,
          headline: portfolio.headline,
          profileImage: portfolio.profileImage,
          portfolioLink: portfolio.portfolioLink,
          about: portfolio.about,
          coverImage: portfolio.coverImage,
          status: portfolio.status,
          submittedDate: portfolio.submittedDate,
          updatedDate: portfolio.updatedDate,
          services: portfolio.services,
        };
      })
    );

    res.status(200).json(portfolios);
  } catch (error) {
    console.error("Error fetching approved portfolios:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update the /api/portfolios-with-users endpoint
app.get("/api/portfolios-with-users", async (req, res) => {
  try {
    const approvedPortfolios = await PortfolioSubmission.find({
      status: "approved",
    }).sort({ submittedDate: -1 });

    const portfoliosWithUserData = await Promise.all(
      approvedPortfolios.map(async (portfolio) => {
        const portfolioData = {
          _id: portfolio._id,
          id: portfolio.id,
          userId: portfolio.userId,
          name: portfolio.name,
          email: portfolio.email,
          workExperience: portfolio.workExperience,
          profession: portfolio.profession || portfolio.headline, // Use headline as fallback
          profileImage: portfolio.profileImage,
          portfolioLink: portfolio.portfolioLink,
          about: portfolio.about,
          coverImage: portfolio.coverImage,
          status: portfolio.status,
          submittedDate: portfolio.submittedDate,
          updatedDate: portfolio.updatedDate,
          services: portfolio.services,
        };

        if (portfolioData.userId) {
          try {
            const user = await User.findById(portfolioData.userId);
            if (user && user.profileImage) {
              portfolioData.profileImage = user.profileImage;
              portfolioData.userProfileImage = user.profileImage;
            }
          } catch (err) {
            console.error(
              `Error fetching user for portfolio ${portfolioData._id}:`,
              err
            );
          }
        }

        return portfolioData;
      })
    );

    res.status(200).json(portfoliosWithUserData);
  } catch (error) {
    console.error("Error fetching portfolios with user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new service endpoint for a user's portfolio
app.post("/api/add-service", async (req, res) => {
  try {
    const { userId, name, description, pricing } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Service name is required",
      });
    }

    // Create a new service
    const newService = {
      name,
      description,
      pricing: pricing || [],
      videos: [],
    };

    // Find the user's portfolio submission
    let portfolio = await PortfolioSubmission.findOne({ userId });

    if (!portfolio) {
      // Create a new portfolio if it doesn't exist
      portfolio = new PortfolioSubmission({
        userId,
        services: [newService],
        status: "pending",
      });
    } else {
      // Check if service with this name already exists
      if (!portfolio.services) {
        portfolio.services = [];
      }

      const existingServiceIndex = portfolio.services.findIndex(
        (service) => service.name === name
      );

      if (existingServiceIndex >= 0) {
        // Update existing service instead of adding duplicate
        portfolio.services[existingServiceIndex] = newService;
      } else {
        // Add new service if it doesn't exist
        portfolio.services.push(newService);
      }
    }

    await portfolio.save();

    // Return the ID of the service
    const serviceId = portfolio.services.find(
      (service) => service.name === name
    )._id;

    res.status(201).json({
      success: true,
      message: "Service added successfully",
      serviceId,
    });
  } catch (error) {
    console.error("Error adding service:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add service",
    });
  }
});

app.put("/api/update-service", async (req, res) => {
  try {
    console.log("UPDATE SERVICE - Request received:", req.body);

    const { userId, serviceName, description, pricing } = req.body;

    // Validate required fields
    if (!userId || !serviceName) {
      console.log("Validation failed - missing fields");
      return res.status(400).json({
        success: false,
        message: "User ID and service name are required",
      });
    }

    // Find the portfolio submission using MongoDB ObjectId
    const portfolio = await PortfolioSubmission.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    console.log("Portfolio found:", !!portfolio);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    // Ensure services array exists
    if (!portfolio.services) {
      portfolio.services = [];
    }

    console.log(
      "Current services:",
      portfolio.services.map((s) => s.name)
    );
    console.log("Looking for service:", serviceName);

    // Find the service by name (exact match)
    const serviceIndex = portfolio.services.findIndex(
      (service) =>
        service.name.trim().toLowerCase() === serviceName.trim().toLowerCase()
    );

    console.log("Service index found:", serviceIndex);

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Service "${serviceName}" not found in portfolio`,
        availableServices: portfolio.services.map((s) => s.name),
      });
    }

    // Update the service
    if (description !== undefined && description !== null) {
      portfolio.services[serviceIndex].description = description;
    }

    if (pricing !== undefined && pricing !== null) {
      portfolio.services[serviceIndex].pricing = pricing;
    }

    // Mark the services array as modified (important for MongoDB)
    portfolio.markModified("services");

    // Save the updated portfolio
    const updatedPortfolio = await portfolio.save();
    console.log("Portfolio updated successfully");

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service: portfolio.services[serviceIndex],
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update service",
      error: error.toString(),
    });
  }
});

app.delete("/api/delete-service", async (req, res) => {
  try {
    console.log("DELETE SERVICE - Request received:", req.body);

    const { userId, serviceName } = req.body;

    // Validate required fields
    if (!userId || !serviceName) {
      console.log("Validation failed - missing fields");
      return res.status(400).json({
        success: false,
        message: "User ID and service name are required",
      });
    }

    // Find the portfolio submission
    const portfolio = await PortfolioSubmission.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    console.log("Portfolio found:", !!portfolio);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    // Ensure services array exists
    if (!portfolio.services || portfolio.services.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No services found in portfolio",
      });
    }

    console.log(
      "Current services:",
      portfolio.services.map((s) => s.name)
    );
    console.log("Deleting service:", serviceName);

    // Find the service by name (exact match)
    const serviceIndex = portfolio.services.findIndex(
      (service) =>
        service.name.trim().toLowerCase() === serviceName.trim().toLowerCase()
    );

    console.log("Service index found:", serviceIndex);

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Service "${serviceName}" not found in portfolio`,
        availableServices: portfolio.services.map((s) => s.name),
      });
    }

    // Remove the service
    portfolio.services.splice(serviceIndex, 1);

    // Mark the services array as modified
    portfolio.markModified("services");

    // Save the updated portfolio
    const updatedPortfolio = await portfolio.save();
    console.log("Service deleted successfully");

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      remainingServices: portfolio.services.length,
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete service",
      error: error.toString(),
    });
  }
});

app.post("/api/add-video", upload.single("videoFile"), async (req, res) => {
  try {
    const { userId, serviceKey, thumbnail } = req.body;

    if (!userId || !serviceKey) {
      return res.status(400).json({
        success: false,
        message: "User ID and service key are required",
      });
    }

    const videoFile = req.file;
    if (!videoFile) {
      return res.status(400).json({
        success: false,
        message: "No video file provided",
      });
    }

    // Create video data
    const videoPath = `/uploads/${videoFile.filename}`;
    const videoData = {
      url: videoPath,
      thumbnail: thumbnail || "",
    };

    // Find the user's portfolio submission
    const portfolio = await PortfolioSubmission.findOne({ userId });
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    // Find the service by converting service key back to name
    const serviceName = serviceKey
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Find the service in the portfolio
    const serviceIndex = portfolio.services.findIndex(
      (service) =>
        service.name.toLowerCase().replace(/\s+/g, "-") === serviceKey
    );

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Service not found in portfolio",
      });
    }

    // Add video to the service
    if (!portfolio.services[serviceIndex].videos) {
      portfolio.services[serviceIndex].videos = [];
    }

    portfolio.services[serviceIndex].videos.push(videoData);
    await portfolio.save();

    // Return the ID of the newly added video
    const videoId =
      portfolio.services[serviceIndex].videos[
        portfolio.services[serviceIndex].videos.length - 1
      ]._id;

    res.status(201).json({
      success: true,
      message: "Video added successfully",
      videoId,
      videoUrl: videoPath,
    });
  } catch (error) {
    console.error("Error adding video:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add video",
    });
  }
});

app.post("/api/remove-video", async (req, res) => {
  try {
    const { userId, videoId, serviceKey } = req.body;

    if (!userId || !videoId || !serviceKey) {
      return res.status(400).json({
        success: false,
        message: "User ID, video ID, and service key are required",
      });
    }

    // Find the user's portfolio submission
    const portfolio = await PortfolioSubmission.findOne({ userId });
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    // Find the service index
    const serviceIndex = portfolio.services.findIndex(
      (service) =>
        service.name.toLowerCase().replace(/\s+/g, "-") === serviceKey
    );

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Service not found in portfolio",
      });
    }

    // Find the video and remove it
    if (!portfolio.services[serviceIndex].videos) {
      return res.status(404).json({
        success: false,
        message: "No videos found for this service",
      });
    }

    const videoIndex = portfolio.services[serviceIndex].videos.findIndex(
      (video) => video._id.toString() === videoId
    );

    if (videoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Get the video path before removing it to delete the file
    const videoPath = portfolio.services[serviceIndex].videos[videoIndex].url;

    // Remove the video from the array
    portfolio.services[serviceIndex].videos.splice(videoIndex, 1);
    await portfolio.save();

    // Clean up the video file if it exists and isn't a placeholder
    if (
      videoPath &&
      !videoPath.includes("api/placeholder") &&
      !videoPath.startsWith("http")
    ) {
      try {
        // Remove the leading slash for path resolution
        const fullVideoPath = path.join(
          __dirname,
          videoPath.replace(/^\/+/, "")
        );

        if (fs.existsSync(fullVideoPath)) {
          fs.unlinkSync(fullVideoPath);
          console.log(`Deleted video file: ${fullVideoPath}`);
        }
      } catch (err) {
        console.error("Error deleting video file:", err);
        // Continue with the response even if file deletion fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Video removed successfully",
    });
  } catch (error) {
    console.error("Error removing video:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove video",
    });
  }
});

app.post("/api/add-work", workUpload.single("workFile"), async (req, res) => {
  try {
    const { userId, title, serviceName } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const workFile = req.file;
    if (!workFile) {
      return res.status(400).json({
        success: false,
        message: "No work file provided",
      });
    }

    // Create work data
    const workPath = `/uploads/${workFile.filename}`;
    const workData = {
      url: workPath,
      thumbnail: workFile.mimetype.startsWith("image/") ? workPath : "",
      title: title || "",
      type: workFile.mimetype.startsWith("video/") ? "video" : "image",
      serviceName: serviceName || "",
      uploadedDate: new Date(),
    };

    // Find the user's portfolio submission
    const portfolio = await PortfolioSubmission.findOne({ userId });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    // Add work to portfolio works array
    if (!portfolio.works) {
      portfolio.works = [];
    }

    portfolio.works.push(workData);
    await portfolio.save();

    res.status(201).json({
      success: true,
      message: "Work added successfully",
      workId: portfolio.works[portfolio.works.length - 1]._id,
      workUrl: workPath,
    });
  } catch (error) {
    console.error("Error adding work:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add work",
    });
  }
});

app.get("/api/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the user's portfolio submission if it exists
    const portfolio = await PortfolioSubmission.findOne({ userId: userId });

    // Ensure headline is available in portfolio
    if (portfolio && !portfolio.headline && portfolio.profession) {
      portfolio.headline = portfolio.profession;
      await portfolio.save();
    }

    // Extract services from portfolio for easier access in frontend
    const services = portfolio?.services || [];

    // Extract videos from all services for easier access in frontend
    let videos = [];
    if (portfolio && portfolio.services) {
      portfolio.services.forEach((service) => {
        if (service.videos && service.videos.length > 0) {
          const serviceKey = service.name.toLowerCase().replace(/\s+/g, "-");
          service.videos.forEach((video) => {
            videos.push({
              id: video._id,
              url: video.url,
              thumbnail: video.thumbnail,
              serviceName: serviceKey,
            });
          });
        }
      });
    }

    // Return user data with their portfolio information
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profession: user.profession,
        phone: user.phone, // Add this line
        profileImage: user.profileImage,
        voatId: user.voatId,
        voatPoints: user.voatPoints,
        badge: user.badge,
      },
      portfolio: portfolio || null,
      services: services,
      videos: videos,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add this temporary endpoint to debug VOAT IDs
app.get("/api/debug/users-voat", async (req, res) => {
  try {
    const users = await User.find({}, { name: 1, email: 1, voatId: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/wishlist/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const wishlistItems = req.body;

    console.log("=== BACKEND WISHLIST UPDATE ===");
    console.log("User ID received:", userId);
    console.log("Wishlist items received:", wishlistItems);
    console.log("Request URL:", req.originalUrl);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("Invalid user ID format:", userId);
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    if (!Array.isArray(wishlistItems)) {
      console.error("Invalid wishlist data:", typeof wishlistItems);
      return res.status(400).json({
        success: false,
        error: "Wishlist data must be an array",
      });
    }

    // Update or create wishlist
    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { userId: userId },
      { $set: { items: wishlistItems } },
      { new: true, upsert: true }
    );

    console.log("Wishlist updated successfully:", updatedWishlist._id);

    res.status(200).json({
      success: true,
      message: "Wishlist updated successfully",
      count: updatedWishlist.items.length,
    });
  } catch (error) {
    console.error("Backend wishlist error:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

// Also make sure GET endpoint is properly defined
app.get("/api/wishlist/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("=== BACKEND WISHLIST GET ===");
    console.log("Fetching wishlist for user:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    let wishlist = await Wishlist.findOne({ userId: userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
      await wishlist.save();
    }

    console.log("Returning wishlist items:", wishlist.items.length);
    return res.status(200).json(wishlist.items || []);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
});

// Add this test endpoint to verify routing works
app.get("/api/test-wishlist", (req, res) => {
  res.json({
    message: "Wishlist route is working",
    timestamp: new Date().toISOString(),
  });
});

// DELETE - Remove item from wishlist
app.delete("/api/wishlist/remove/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const { userId } = req.body;

    console.log(`Removing item ${itemId} from wishlist for user ${userId}`);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Valid User ID is required",
      });
    }

    // Remove item from wishlist
    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { id: itemId } } },
      { new: true }
    );

    if (!updatedWishlist) {
      return res.status(404).json({
        success: false,
        error: "Wishlist not found",
      });
    }

    console.log(
      `Item ${itemId} successfully removed from wishlist for user ${userId}`
    );
    res.status(200).json({
      success: true,
      message: "Item removed from wishlist",
      remainingItems: updatedWishlist.items.length,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
});

app.post("/api/create-booking", async (req, res) => {
  try {
    const {
      clientId,
      clientName,
      clientEmail,
      clientProfileImage,
      freelancerId,
      freelancerName,
      freelancerEmail,
      serviceName,
      servicePrice,
    } = req.body;

    console.log("Creating booking with data:", req.body);

    // Validate required fields
    if (
      !clientId ||
      !clientName ||
      !clientEmail ||
      !freelancerId ||
      !freelancerName ||
      !freelancerEmail ||
      !serviceName ||
      !servicePrice
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check if client and freelancer exist
    const client = await User.findById(clientId);
    const freelancer = await User.findById(freelancerId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    if (!freelancer) {
      return res.status(404).json({
        success: false,
        message: "Freelancer not found",
      });
    }

    // Check if there's already a pending booking between these users for this service
    const existingBooking = await Booking.findOne({
      clientId,
      freelancerId,
      serviceName,
      status: "pending",
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending booking for this service",
      });
    }

    // Create new booking
    const newBooking = new Booking({
      clientId,
      clientName,
      clientEmail,
      clientProfileImage,
      freelancerId,
      freelancerName,
      freelancerEmail,
      serviceName,
      servicePrice,
      status: "pending",
      requestDate: new Date(),
    });

    const savedBooking = await newBooking.save();

    console.log("Booking created successfully:", savedBooking._id);

    res.status(201).json({
      success: true,
      message: "Booking request created successfully",
      booking: savedBooking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create booking request",
      error: error.message,
    });
  }
});

// Get Bookings for Freelancer
app.get("/api/bookings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching bookings for freelancer:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find all bookings where the user is the freelancer
    const bookings = await Booking.find({ freelancerId: userId })
      .sort({ requestDate: -1 })
      .populate("clientId", "name email profileImage")
      .populate("freelancerId", "name email profileImage");

    console.log(`Found ${bookings.length} bookings for freelancer ${userId}`);

    // Format the bookings data
    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      id: booking._id,
      clientId: booking.clientId,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientProfileImage: booking.clientProfileImage,
      freelancerId: booking.freelancerId,
      freelancerName: booking.freelancerName,
      freelancerEmail: booking.freelancerEmail,
      serviceName: booking.serviceName,
      servicePrice: booking.servicePrice,
      status: booking.status,
      requestDate: booking.requestDate,
      responseDate: booking.responseDate,
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }));

    res.status(200).json(formattedBookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
});

// Get Bookings for Client (orders)
app.get("/api/orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching orders for client:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find all bookings where the user is the client
    const orders = await Booking.find({ clientId: userId })
      .sort({ requestDate: -1 })
      .populate("clientId", "name email profileImage")
      .populate("freelancerId", "name email profileImage");

    console.log(`Found ${orders.length} orders for client ${userId}`);

    // Format the orders data to match existing structure
    const formattedOrders = orders.map((order, index) => ({
      id: `ORD-${String(index + 1).padStart(3, "0")}`,
      service: order.serviceName,
      status:
        order.status === "accepted"
          ? "In Progress"
          : order.status === "rejected"
          ? "Cancelled"
          : "Pending",
      date: order.requestDate.toISOString().split("T")[0],
      amount: order.servicePrice,
      provider: order.freelancerName,
      providerImage: order.freelancerId?.profileImage || null,
      bookingId: order._id,
      requestDate: order.requestDate,
      responseDate: order.responseDate,
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// Update Booking Status (Accept/Reject)
app.put("/api/booking/:bookingId/action", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { action } = req.body;

    console.log(`${action}ing booking:`, bookingId);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'accept' or 'reject'",
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if booking is already processed
    if (booking.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: `Booking has already been ${booking.status}`,
      });
    }

    // Update booking status
    const newStatus = action === "accept" ? "accepted" : "rejected";
    booking.status = newStatus;
    booking.responseDate = new Date();

    const updatedBooking = await booking.save();

    console.log(`Booking ${bookingId} successfully ${action}ed`);

    // Here you could also send email notifications to the client
    // or create notifications in the system

    res.status(200).json({
      success: true,
      message: `Booking request ${action}ed successfully`,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error(`Error ${req.body.action}ing booking:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to ${req.body.action} booking request`,
      error: error.message,
    });
  }
});

// Get Booking Details
app.get("/api/booking/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    console.log("Fetching booking details:", bookingId);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate("clientId", "name email profileImage voatId")
      .populate("freelancerId", "name email profileImage voatId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      booking: booking,
    });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking details",
      error: error.message,
    });
  }
});

// Delete/Cancel Booking
app.delete("/api/booking/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body; // Either client or freelancer can cancel

    console.log("Cancelling booking:", bookingId, "by user:", userId);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user is authorized to cancel this booking
    if (
      booking.clientId.toString() !== userId &&
      booking.freelancerId.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this booking",
      });
    }

    // Only allow cancellation if booking is pending
    if (booking.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: `Cannot cancel a booking that has been ${booking.status}`,
      });
    }

    await Booking.findByIdAndDelete(bookingId);

    console.log(`Booking ${bookingId} successfully cancelled`);

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
});

// Get Booking Statistics for Dashboard
app.get("/api/booking-stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching booking statistics for user:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Get stats for freelancer
    const pendingCount = await Booking.countDocuments({
      freelancerId: userId,
      status: "pending",
    });

    const acceptedCount = await Booking.countDocuments({
      freelancerId: userId,
      status: "accepted",
    });

    const rejectedCount = await Booking.countDocuments({
      freelancerId: userId,
      status: "rejected",
    });

    const totalBookings = await Booking.countDocuments({
      freelancerId: userId,
    });

    // Calculate total earnings from accepted bookings
    const acceptedBookings = await Booking.find({
      freelancerId: userId,
      status: "accepted",
    });

    const totalEarnings = acceptedBookings.reduce(
      (sum, booking) => sum + booking.servicePrice,
      0
    );

    const stats = {
      totalBookings,
      pendingCount,
      acceptedCount,
      rejectedCount,
      totalEarnings,
      acceptanceRate:
        totalBookings > 0
          ? Math.round((acceptedCount / totalBookings) * 100)
          : 0,
    };

    console.log("Booking stats:", stats);

    res.status(200).json({
      success: true,
      stats: stats,
    });
  } catch (error) {
    console.error("Error fetching booking statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking statistics",
      error: error.message,
    });
  }
});

// Update Booking Notes
app.put("/api/booking/:bookingId/notes", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { notes, userId } = req.body;

    console.log("Updating booking notes:", bookingId);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user is authorized to update notes
    if (
      booking.clientId.toString() !== userId &&
      booking.freelancerId.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this booking",
      });
    }

    booking.notes = notes;
    const updatedBooking = await booking.save();

    console.log(`Booking ${bookingId} notes updated successfully`);

    res.status(200).json({
      success: true,
      message: "Booking notes updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error updating booking notes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update booking notes",
      error: error.message,
    });
  }
});

// Get Recent Bookings for Dashboard
app.get("/api/recent-bookings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5 } = req.query;

    console.log("Fetching recent bookings for user:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const recentBookings = await Booking.find({
      freelancerId: userId,
    })
      .sort({ requestDate: -1 })
      .limit(parseInt(limit))
      .populate("clientId", "name email profileImage");

    console.log(`Found ${recentBookings.length} recent bookings`);

    res.status(200).json({
      success: true,
      bookings: recentBookings,
    });
  } catch (error) {
    console.error("Error fetching recent bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent bookings",
      error: error.message,
    });
  }
});

// Search Bookings
app.get("/api/bookings/:userId/search", async (req, res) => {
  try {
    const { userId } = req.params;
    const { query, status, dateFrom, dateTo } = req.query;

    console.log("Searching bookings for user:", userId, "with query:", query);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Build search criteria
    let searchCriteria = {
      freelancerId: userId,
    };

    // Add text search
    if (query) {
      searchCriteria.$or = [
        { clientName: { $regex: query, $options: "i" } },
        { clientEmail: { $regex: query, $options: "i" } },
        { serviceName: { $regex: query, $options: "i" } },
      ];
    }

    // Add status filter
    if (status && status !== "all") {
      searchCriteria.status = status;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      searchCriteria.requestDate = {};
      if (dateFrom) {
        searchCriteria.requestDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        searchCriteria.requestDate.$lte = new Date(dateTo);
      }
    }

    const bookings = await Booking.find(searchCriteria)
      .sort({ requestDate: -1 })
      .populate("clientId", "name email profileImage");

    console.log(`Found ${bookings.length} bookings matching search criteria`);

    res.status(200).json({
      success: true,
      bookings: bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error("Error searching bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search bookings",
      error: error.message,
    });
  }
});

// Admin endpoint to get all bookings (for admin dashboard)
app.get("/api/admin/all-bookings", async (req, res) => {
  try {
    console.log("Fetching all bookings for admin");

    const bookings = await Booking.find({})
      .sort({ requestDate: -1 })
      .populate("clientId", "name email profileImage voatId")
      .populate("freelancerId", "name email profileImage voatId");

    console.log(`Found ${bookings.length} total bookings`);

    // Calculate some stats
    const stats = {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      accepted: bookings.filter((b) => b.status === "accepted").length,
      rejected: bookings.filter((b) => b.status === "rejected").length,
    };

    res.status(200).json({
      success: true,
      bookings: bookings,
      stats: stats,
    });
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch all bookings",
      error: error.message,
    });
  }
});

// Endpoint to check if user can book a service (prevent duplicate bookings)
app.post("/api/check-booking-eligibility", async (req, res) => {
  try {
    const { clientId, freelancerId, serviceName } = req.body;

    console.log("Checking booking eligibility:", {
      clientId,
      freelancerId,
      serviceName,
    });

    if (!clientId || !freelancerId || !serviceName) {
      return res.status(400).json({
        success: false,
        message: "Client ID, freelancer ID, and service name are required",
      });
    }

    // Check for existing pending booking
    const existingBooking = await Booking.findOne({
      clientId,
      freelancerId,
      serviceName,
      status: "pending",
    });

    const canBook = !existingBooking;

    res.status(200).json({
      success: true,
      canBook: canBook,
      message: canBook
        ? "Eligible to book"
        : "You already have a pending booking for this service",
      existingBooking: existingBooking || null,
    });
  } catch (error) {
    console.error("Error checking booking eligibility:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check booking eligibility",
      error: error.message,
    });
  }
});

console.log("✅ Booking API endpoints loaded successfully");

// Add these debugging routes for development
if (process.env.NODE_ENV === "development") {
  // Debug endpoint to clear all bookings
  app.delete("/api/debug/clear-bookings", async (req, res) => {
    try {
      await Booking.deleteMany({});
      res.json({ message: "All bookings cleared" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to create sample bookings
  app.post("/api/debug/create-sample-bookings", async (req, res) => {
    try {
      const users = await User.find({}).limit(4);
      if (users.length < 2) {
        return res.status(400).json({ message: "Need at least 2 users" });
      }

      const sampleBookings = [
        {
          clientId: users[0]._id,
          clientName: users[0].name,
          clientEmail: users[0].email,
          clientProfileImage: users[0].profileImage,
          freelancerId: users[1]._id,
          freelancerName: users[1].name,
          freelancerEmail: users[1].email,
          serviceName: "Web Development",
          servicePrice: 2500,
          status: "pending",
        },
        {
          clientId: users[0]._id,
          clientName: users[0].name,
          clientEmail: users[0].email,
          clientProfileImage: users[0].profileImage,
          freelancerId: users[1]._id,
          freelancerName: users[1].name,
          freelancerEmail: users[1].email,
          serviceName: "Logo Design",
          servicePrice: 500,
          status: "accepted",
        },
      ];

      const createdBookings = await Booking.insertMany(sampleBookings);
      res.json({
        message: "Sample bookings created",
        bookings: createdBookings,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Set VOAT ID endpoint

app.post("/api/set-voat-id", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a new VOAT ID if one doesn't exist
    if (!user.voatId) {
      const randomPart = uuidv4().substring(0, 9).toUpperCase();
      user.voatId = `VOAT-${randomPart.substring(0, 4)}-${randomPart.substring(
        4,
        8
      )}`;

      await user.save();
      console.log(`Set VOAT ID for user ${userId}: ${user.voatId}`);

      return res.status(200).json({
        message: "VOAT ID set successfully",
        user: {
          id: user._id,
          voatId: user.voatId,
        },
      });
    } else {
      return res.status(200).json({
        message: "User already has a VOAT ID",
        user: {
          id: user._id,
          voatId: user.voatId,
        },
      });
    }
  } catch (error) {
    console.error("Set VOAT ID error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update existing users without VOAT IDs
const updateExistingUsers = async () => {
  try {
    // Find all users without a VOAT ID
    const usersWithoutVoatId = await User.find({ voatId: { $exists: false } });
    console.log(`Found ${usersWithoutVoatId.length} users without VOAT ID`);

    // Update each user
    for (const user of usersWithoutVoatId) {
      const randomPart = uuidv4().substring(0, 9).toUpperCase();
      user.voatId = `VOAT-${randomPart.substring(0, 4)}-${randomPart.substring(
        4,
        8
      )}`;
      await user.save();
      console.log(`Updated user ${user.email} with VOAT ID: ${user.voatId}`);
    }

    console.log("All users updated successfully");
  } catch (error) {
    console.error("Error updating users:", error);
  }
};

// Admin endpoint to trigger VOAT ID update for all users
app.get("/api/admin/update-missing-voat-ids", async (req, res) => {
  try {
    await updateExistingUsers();
    res.status(200).json({ message: "Users updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update users" });
  }
});

// Get a user's VOAT ID
app.get("/api/user-voat-id/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ voatId: user.voatId });
  } catch (error) {
    console.error("Error fetching VOAT ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Migration endpoint to ensure headline field exists in all portfolios
app.get("/api/admin/migrate-headlines", async (req, res) => {
  try {
    // Find all portfolios without a headline field
    const portfoliosWithoutHeadline = await PortfolioSubmission.find({
      $or: [
        { headline: { $exists: false } },
        { headline: null },
        { headline: "" },
      ],
      profession: { $exists: true, $ne: null, $ne: "" },
    });

    console.log(
      `Found ${portfoliosWithoutHeadline.length} portfolios without headline field`
    );

    // Update each portfolio
    let updatedCount = 0;
    for (const portfolio of portfoliosWithoutHeadline) {
      portfolio.headline = portfolio.profession;
      await portfolio.save();
      updatedCount++;
    }

    // Now check for portfolios without profession
    const portfoliosWithoutProfession = await PortfolioSubmission.find({
      $or: [
        { profession: { $exists: false } },
        { profession: null },
        { profession: "" },
      ],
      headline: { $exists: true, $ne: null, $ne: "" },
    });

    console.log(
      `Found ${portfoliosWithoutProfession.length} portfolios without profession field`
    );

    // Update each portfolio
    for (const portfolio of portfoliosWithoutProfession) {
      portfolio.profession = portfolio.headline;
      await portfolio.save();
      updatedCount++;
    }

    res.status(200).json({
      message: "Portfolio migration completed successfully",
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Error migrating portfolios:", error);
    res.status(500).json({ error: "Failed to migrate portfolios" });
  }
});

app.get("/api/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
        path: middleware.route.path,
      });
    }
  });
  res.json(routes);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
