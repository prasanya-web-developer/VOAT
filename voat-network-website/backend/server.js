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
  origin: ["https://voat-network.netlify.app", "http://localhost:3000"],
  credentials: true,
};

app.use(cors(corsOptions));
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

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/svg+xml",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
    return cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
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

// Updated Portfolio Schema to include headline field separately
const PortfolioSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String },
    profession: { type: String }, // Keep for backward compatibility
    headline: { type: String }, // Add headline field explicitly
    workExperience: { type: String },
    about: { type: String },
    email: { type: String },
    profileImage: { type: String },
    coverImage: { type: String },
    portfolioLink: { type: String },
    resumePath: { type: String },
    services: [ServiceSchema],
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

// Signup Route
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password, role, profession } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate VOAT ID during signup
    const randomPart = uuidv4().substring(0, 9).toUpperCase();
    const voatId = `VOAT-${randomPart.substring(0, 4)}-${randomPart.substring(
      4,
      8
    )}`;
    console.log(`Generated VOAT ID for new user: ${voatId}`); // Debug log

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      profession,
      voatId, // Set the VOAT ID at creation
      voatPoints: 0,
      badge: "bronze",
    });

    const savedUser = await newUser.save();
    console.log(`User saved with VOAT ID: ${savedUser.voatId}`); // Debug log

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        profession: savedUser.profession,
        voatId: savedUser.voatId,
        voatPoints: savedUser.voatPoints,
        badge: savedUser.badge,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal Server Error" });
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

app.post("/api/test-connection", (req, res) => {
  console.log("Test connection endpoint hit");
  res
    .status(200)
    .json({ status: "success", message: "Connection test successful" });
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
        headline, // Accept headline explicitly
        workExperience,
        about,
        email,
        portfolioLink,
        isNewSubmission,
        service,
      } = req.body;

      // Validate essential fields
      if (!name || !(profession || headline) || !email) {
        return res.status(400).json({
          success: false,
          message: "Name, profession/headline and email are required",
        });
      }

      // Get file paths if files were uploaded
      const profileImageFile = req.files?.profileImage?.[0];
      const coverImageFile = req.files?.coverImage?.[0];

      // Prepare update data
      const portfolioData = {
        name,
        profession: profession || headline, // Use either value for backward compatibility
        headline: headline || profession, // Store headline explicitly
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
              // If portfolio exists, add the service to it
              if (!existingPortfolio.services) {
                existingPortfolio.services = [];
              }

              existingPortfolio.services.push(newService);
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

    // Create a new array with only the necessary fields, explicitly excluding headline
    const portfolios = approvedPortfolios.map((portfolio) => {
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
      return portfolioData;
    });

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
      // Add service to existing portfolio
      if (!portfolio.services) {
        portfolio.services = [];
      }
      portfolio.services.push(newService);
    }

    await portfolio.save();

    // Return the ID of the newly created service
    const serviceId = portfolio.services[portfolio.services.length - 1]._id;

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
        profileImage: user.profileImage,
        voatId: user.voatId,
        voatPoints: user.voatPoints,
        badge: user.badge,
      },
      portfolio: portfolio || null,
      services: services,
      videos: videos, // Include videos in the response
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 1. GET - Retrieve user wishlist
app.get("/api/wishlist/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user's wishlist in database
    const user = await User.findById(userId);
    if (user && user.wishlist) {
      return res.status(200).json(user.wishlist);
    }

    // Return empty array if no wishlist found
    return res.status(200).json([]);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. POST - Update wishlist (add or replace entire wishlist)
app.post("/api/wishlist/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const wishlistItems = req.body;

    // Update user's wishlist in database
    const user = await User.findById(userId);
    if (user) {
      user.wishlist = wishlistItems;
      await user.save();
    }

    res.status(200).json({ success: true, message: "Wishlist updated" });
  } catch (error) {
    console.error("Error updating wishlist:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. DELETE - Remove item from wishlist
app.delete("/api/wishlist/remove/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Update user's wishlist in database
    const user = await User.findById(userId);
    if (user && user.wishlist) {
      user.wishlist = user.wishlist.filter((item) => item.id !== itemId);
      await user.save();
    }

    res
      .status(200)
      .json({ success: true, message: "Item removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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

// Serve React frontend
// app.use(express.static(path.resolve(__dirname, "../frontend/build")));

// app.get("*", (req, res) => {
//   res.sendFile(path.resolve(__dirname, "../frontend/build", "index.html"));
// });

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
