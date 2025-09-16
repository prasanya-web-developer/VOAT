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
    "https://www.voatnetwork.com",
    "http://localhost:3000",
    "https://voat-network.netlify.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions));

// Handler for OPTIONS requests
app.options("*", cors(corsOptions));
app.use(bodyParser.json());

//debugging middleware
app.use((req, res, next) => {
  if (req.url.includes("quick-booking")) {
    console.log(`=== QUICK BOOKING ROUTE DEBUG ===`);
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.originalUrl}`
    );
    console.log(`Headers:`, req.headers);
    if (req.method === "POST") {
      console.log(`Body:`, req.body);
    }
  }
  next();
});

// Add specific headers for static file serving
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
  console.log("Created uploads directory with proper permissions");
}

// Create resumes directory if it doesn't exist
// const resumesDir = path.join(__dirname, "uploads/resumes");
// if (!fs.existsSync(resumesDir)) {
//   fs.mkdirSync(resumesDir, { recursive: true });
// }

// Multer for file uploads
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
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/webm",
    "video/quicktime",
  ];

  console.log("Checking file type:", file.mimetype);

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${
          file.mimetype
        } not allowed. Allowed types: ${allowedTypes.join(", ")}`
      ),
      false
    );
  }
};

const workUpload = multer({
  storage: storage,
  fileFilter: workFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size for videos
    files: 10, // Maximum 10 files per upload
  },
});

console.log("✅ Portfolio work upload API endpoints loaded successfully");

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Multer for resume uploads
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
  phone: String,
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
    isHold: { type: Boolean, default: false },
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
    isRecommended: { type: Boolean, default: false }, // Keep only one isRecommended field
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

const CartSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [
      {
        freelancerId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        freelancerName: { type: String, required: true },
        freelancerProfileImage: { type: String },
        serviceName: { type: String, required: true },
        serviceLevel: { type: String, required: true }, // Basic, Standard, Premium
        basePrice: { type: Number, required: true },
        selectedPaymentAmount: { type: Number, required: true },
        paymentStructure: {
          type: {
            type: String,
            enum: ["advance", "middle", "final", "custom"],
            required: true,
          },
          amount: { type: Number, required: true },
          description: { type: String, required: true },
          breakdown: {
            advance: { type: Number, default: 0 },
            middle: { type: Number, default: 0 },
            final: { type: Number, default: 0 },
          },
        },
        addedDate: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", CartSchema);

const QuickBookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientPhone: { type: String, required: true },
    serviceName: { type: String, required: true },
    budget: { type: String, required: true },
    description: { type: String },
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
    adminNotes: { type: String },
    type: {
      type: String,
      default: "quick_booking",
    },
  },
  { timestamps: true }
);

const QuickBooking = mongoose.model("QuickBooking", QuickBookingSchema);

// Notification Schema
const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["booking", "order", "portfolio", "system", "payment"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: String, // Can reference booking ID, order ID, etc.
    },
    metadata: {
      type: Object, // Additional data specific to notification type
      default: {},
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);

const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay with your credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log(
  "✅ Razorpay initialized with Key ID:",
  process.env.RAZORPAY_KEY_ID ? "Present" : "Missing"
);

// Payment Transaction Schema
const PaymentTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: { type: String, required: true },
    paymentId: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "attempted", "paid", "failed", "cancelled"],
      default: "created",
    },
    paymentMethod: { type: String },
    items: [
      {
        serviceId: String,
        serviceName: String,
        freelancerName: String,
        amount: Number,
      },
    ],
    upiTransactionId: { type: String },
    qrCodeData: { type: String },
    failureReason: { type: String },
    metadata: { type: Object },
  },
  { timestamps: true }
);

const PaymentTransaction = mongoose.model(
  "PaymentTransaction",
  PaymentTransactionSchema
);

const OrderSchema = new mongoose.Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    freelancerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    freelancerName: { type: String, required: true },
    freelancerEmail: { type: String, required: true },
    serviceName: { type: String, required: true },
    serviceLevel: { type: String, default: "Standard" },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "in-progress",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    completedDate: {
      type: Date,
    },
    notes: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

// Helper function to calculate total works size for a user
const calculateUserWorksSize = async (userId) => {
  try {
    const portfolio = await PortfolioSubmission.findOne({ userId });
    if (!portfolio || !portfolio.works) return 0;

    let totalSize = 0;

    for (const work of portfolio.works) {
      if (work.url && !work.url.startsWith("http")) {
        const filePath = path.join(__dirname, work.url.replace(/^\/+/, ""));
        try {
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
          }
        } catch (err) {
          console.error(`Error checking file size for ${filePath}:`, err);
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error("Error calculating user works size:", error);
    return 0;
  }
};

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  next();
});

// Signup Route
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password, role, profession, phone } = req.body;

    // Log the request data (without password) for debugging
    console.log("Signup request received:", {
      name,
      email,
      role,
      profession,
      phone,
    });

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
      phone,
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
        phone: savedUser.phone,
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
      console.log(`Generated VOAT ID during login: ${user.voatId}`);
    }

    if (user.voatPoints === undefined) {
      user.voatPoints = 0;
      wasUpdated = true;
    }

    if (!user.badge) {
      user.badge = "bronze";
      wasUpdated = true;
    }

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
        phone: user.phone,
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

// profile route with file upload
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

      if (voatId) user.voatId = voatId;
      if (voatPoints !== undefined) user.voatPoints = voatPoints;
      if (badge) user.badge = badge;

      if (req.file) {
        // Clean up old image if it exists
        if (
          user.profileImage &&
          !user.profileImage.includes("api/placeholder") &&
          !user.profileImage.startsWith("http")
        ) {
          try {
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

        user.profileImage = `/uploads/${req.file.filename}`;
        console.log("New profile image saved:", user.profileImage);

        // Update portfolio submissions with new image
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

      // ✅ CREATE NOTIFICATION FOR PROFILE UPDATE
      await createNotification({
        userId: user._id,
        type: "system",
        title: "Profile Updated",
        message: "Your profile has been updated successfully!",
        relatedId: user._id.toString(),
        metadata: {
          action: "profile_update",
          timestamp: new Date().toISOString(),
        },
      });

      const responseData = {
        message: "Profile updated successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profession: user.profession,
          phone: user.phone,
          profileImage: user.profileImage,
          voatId: user.voatId,
          voatPoints: user.voatPoints,
          badge: user.badge,
        },
        profileImage: user.profileImage,
      };

      console.log("Profile update response:", responseData);
      res.status(200).json(responseData);
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
    console.log("Update user data request:", req.body);

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
      console.log(`Updated VOAT ID to: ${voatId}`);
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
      console.log("User updated successfully, VOAT ID:", updatedUser.voatId);
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
      phone: user.phone,
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

app.post("/api/test-connection", (req, res) => {
  console.log("Test connection request received from:", req.headers.origin);
  res.status(200).json({
    status: "success",
    message: "Connection test successful",
    server: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

// Portfolio Submission Route

app.post(
  "/api/portfolio",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "workFiles", maxCount: 10 },
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
        hasProfileImage,
        profileImagePath,
        profileInitials,
        userName,
      } = req.body;

      if (!name || !profession || !email) {
        return res.status(400).json({
          success: false,
          message: "Name, profession, and email are required",
        });
      }

      // Get file paths if files were uploaded
      const profileImageFile = req.files?.profileImage?.[0];
      const coverImageFile = req.files?.coverImage?.[0];
      const workFiles = req.files?.workFiles || [];

      console.log("Work files received:", workFiles.length);

      // Prepare update data
      const portfolioData = {
        name,
        profession,
        headline,
        workExperience,
        about,
        email,
        portfolioLink,
      };

      // Handle profile image - prioritize existing user profile image
      if (hasProfileImage === "true" && profileImagePath) {
        portfolioData.profileImage = profileImagePath;
      } else if (profileImageFile) {
        portfolioData.profileImage = `/uploads/${profileImageFile.filename}`;
      }

      if (coverImageFile) {
        portfolioData.coverImage = `/uploads/${coverImageFile.filename}`;
      }

      // Process work files correctly with file size validation
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB in bytes
      const workItems = [];

      for (const file of workFiles) {
        // Check file size
        if (file.size > MAX_SIZE) {
          return res.status(400).json({
            success: false,
            message: `File "${file.originalname}" exceeds 50MB limit. Please use smaller files.`,
          });
        }

        const isVideo = file.mimetype.startsWith("video/");
        const workItem = {
          url: `/uploads/${file.filename}`,
          thumbnail: isVideo ? "" : `/uploads/${file.filename}`,
          title: file.originalname.split(".")[0],
          type: isVideo ? "video" : "image",
          serviceName: "", // Will be filled from form data if available
          uploadedDate: new Date(),
        };
        workItems.push(workItem);
      }

      console.log("Processed work items:", workItems.length);

      // Set status to pending for new submissions
      if (isNewSubmission === "true") {
        portfolioData.status = "pending";
        portfolioData.submittedDate = new Date();
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
        if (isNewSubmission === "true") {
          // If we have a service to add and it's a new submission
          if (serviceData) {
            const newService = {
              name: serviceData.name,
              description: serviceData.description,
              pricing: serviceData.pricing || [],
            };

            const existingPortfolio = await PortfolioSubmission.findOne({
              userId,
            });

            if (existingPortfolio) {
              if (!existingPortfolio.services) {
                existingPortfolio.services = [];
              }

              const existingServiceIndex = existingPortfolio.services.findIndex(
                (service) => service.name === newService.name
              );

              if (existingServiceIndex >= 0) {
                existingPortfolio.services[existingServiceIndex] = newService;
              } else {
                existingPortfolio.services.push(newService);
              }

              // Add work items to existing portfolio
              if (!existingPortfolio.works) {
                existingPortfolio.works = [];
              }
              existingPortfolio.works.push(...workItems);

              existingPortfolio.status = "pending";
              existingPortfolio.submittedDate = new Date();

              Object.assign(existingPortfolio, portfolioData);
              portfolio = await existingPortfolio.save();
            } else {
              // Create new portfolio with works
              portfolio = new PortfolioSubmission({
                ...portfolioData,
                userId,
                services: [newService],
                works: workItems,
                status: "pending",
                submittedDate: new Date(),
              });

              await portfolio.save();
            }
          } else {
            // Handle portfolio without service but with works
            const existingPortfolio = await PortfolioSubmission.findOne({
              userId,
            });

            if (existingPortfolio) {
              if (!existingPortfolio.works) {
                existingPortfolio.works = [];
              }
              existingPortfolio.works.push(...workItems);

              Object.assign(existingPortfolio, {
                ...portfolioData,
                status: "pending",
                submittedDate: new Date(),
              });

              portfolio = await existingPortfolio.save();
            } else {
              portfolio = new PortfolioSubmission({
                ...portfolioData,
                userId,
                works: workItems,
                status: "pending",
                submittedDate: new Date(),
              });

              await portfolio.save();
            }
          }
        } else {
          // Normal update - add works if any
          const updateData = { ...portfolioData };

          if (workItems.length > 0) {
            updateData.$push = { works: { $each: workItems } };
          }

          portfolio = await PortfolioSubmission.findOneAndUpdate(
            { userId },
            updateData,
            { upsert: true, new: true }
          );
        }
      } else {
        // For non-logged in users, always create new submission
        if (serviceData) {
          portfolio = new PortfolioSubmission({
            ...portfolioData,
            services: [
              {
                name: serviceData.name,
                description: serviceData.description,
                pricing: serviceData.pricing || [],
              },
            ],
            works: workItems,
            status: "pending",
            submittedDate: new Date(),
          });
        } else {
          portfolio = new PortfolioSubmission({
            ...portfolioData,
            works: workItems,
            status: "pending",
            submittedDate: new Date(),
          });
        }
        await portfolio.save();
      }

      // Create notification for portfolio submission
      if (userId && isNewSubmission === "true") {
        try {
          await createNotification({
            userId: userId,
            type: "portfolio",
            title: "Portfolio Submitted",
            message: "Your portfolio has been submitted and is pending review",
            relatedId: portfolio._id.toString(),
            metadata: {
              action: "portfolio_submission",
              worksCount: workItems.length,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (notificationError) {
          console.error("Error creating notification:", notificationError);
        }
      }

      res.status(200).json({
        success: true,
        message:
          isNewSubmission === "true"
            ? "Portfolio submitted successfully and pending admin approval"
            : "Portfolio updated successfully",
        portfolio: portfolio,
        worksUploaded: workItems.length,
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

    // Find the portfolio submission by ID and populate works
    const submission = await PortfolioSubmission.findById(id);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Clean up any potential service duplicates before sending
    if (submission.services && Array.isArray(submission.services)) {
      const uniqueServicesMap = new Map();

      submission.services.forEach((service) => {
        if (service.name) {
          uniqueServicesMap.set(service.name, service);
        }
      });

      submission.services = Array.from(uniqueServicesMap.values());
      await submission.save();
    }

    // FIXED: Ensure works are properly formatted
    if (submission.works) {
      submission.works = submission.works.map((work) => ({
        ...work,
        url:
          work.url && work.url.startsWith("/")
            ? work.url
            : `/uploads/${work.url}`,
        thumbnail:
          work.thumbnail ||
          (work.type === "image" ? work.url : "/api/placeholder/150/150"),
      }));
    }

    // Return the cleaned submission with works
    res.status(200).json(submission);
  } catch (error) {
    console.error("Error fetching portfolio submission:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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

    // Send notification to user
    console.log(`Portfolio submission ${id} status updated to ${status}`);

    res.status(200).json(submission);
  } catch (error) {
    console.error("Error updating submission status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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

app.get("/api/portfolios", async (req, res) => {
  try {
    console.log("in /api/portfolios");

    const portfolios = await PortfolioSubmission.aggregate([
      // Step 1: Find approved portfolios that are not held
      {
        $match: {
          status: "approved",
          // More flexible hold checking
          $and: [
            {
              $or: [
                { isHold: { $exists: false } },
                { isHold: false },
                { isHold: null },
              ],
            },
          ],
        },
      },
      // Step 2: Sort by date, newest first
      {
        $sort: { submittedDate: -1 },
      },
      // Step 3: Join with users collection - make it optional
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      // Step 4: Unwind but preserve entries without user details
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Step 5: Project with fallbacks
      {
        $project: {
          _id: 1,
          id: "$_id",
          userId: 1,
          uservoatId: { $ifNull: ["$userDetails.voatId", null] },
          name: { $ifNull: ["$name", "Unknown"] },
          email: { $ifNull: ["$email", ""] },
          workExperience: { $ifNull: ["$workExperience", "0"] },
          profession: { $ifNull: ["$profession", "$headline"] },
          headline: { $ifNull: ["$headline", "$profession"] },
          profileImage: {
            $ifNull: ["$profileImage", "$userDetails.profileImage"],
          },
          portfolioLink: 1,
          about: 1,
          coverImage: 1,
          status: 1,
          submittedDate: 1,
          updatedDate: 1,
          services: { $ifNull: ["$services", []] },
          isHold: { $ifNull: ["$isHold", false] },
          isRecommended: { $ifNull: ["$isRecommended", false] },
        },
      },
    ]);

    console.log(`Found ${portfolios.length} approved portfolios`);

    // Additional server-side filtering to ensure data quality
    const filteredPortfolios = portfolios.filter((portfolio) => {
      // Ensure we have basic required fields
      if (!portfolio.name || portfolio.name.trim() === "") {
        console.log("Filtering out portfolio with empty name");
        return false;
      }

      // Ensure status is explicitly approved
      if (portfolio.status !== "approved") {
        console.log(`Filtering out portfolio with status: ${portfolio.status}`);
        return false;
      }

      // Ensure not held
      if (portfolio.isHold === true) {
        console.log(`Filtering out held portfolio: ${portfolio.name}`);
        return false;
      }

      return true;
    });

    console.log(
      `After server-side filtering: ${filteredPortfolios.length} portfolios`
    );

    res.status(200).json(filteredPortfolios);
  } catch (error) {
    console.error("Error fetching approved portfolios:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/debug/portfolios", async (req, res) => {
  try {
    console.log("Debug: Checking all portfolio submissions");

    const allPortfolios = await PortfolioSubmission.find({})
      .sort({ submittedDate: -1 })
      .limit(50); // Limit to last 50 for performance

    const portfolioSummary = allPortfolios.map((portfolio) => ({
      id: portfolio._id,
      name: portfolio.name,
      email: portfolio.email,
      status: portfolio.status,
      isHold: portfolio.isHold,
      isRecommended: portfolio.isRecommended,
      profession: portfolio.profession,
      headline: portfolio.headline,
      submittedDate: portfolio.submittedDate,
      userId: portfolio.userId,
    }));

    const statusCounts = {
      total: allPortfolios.length,
      approved: allPortfolios.filter((p) => p.status === "approved").length,
      pending: allPortfolios.filter((p) => p.status === "pending").length,
      rejected: allPortfolios.filter((p) => p.status === "rejected").length,
      held: allPortfolios.filter((p) => p.isHold === true).length,
      recommended: allPortfolios.filter((p) => p.isRecommended === true).length,
    };

    const approvedNotHeld = allPortfolios.filter(
      (p) => p.status === "approved" && p.isHold !== true
    ).length;

    res.json({
      summary: statusCounts,
      approvedNotHeld,
      portfolios: portfolioSummary,
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

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
          profession: portfolio.profession || portfolio.headline,
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

// DELETE - Delete portfolio submission
app.delete("/api/admin/portfolio-submission/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Deleting portfolio submission:", id);

    const submission = await PortfolioSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Portfolio submission not found",
      });
    }

    // Clean up uploaded files if they exist
    const filesToDelete = [];
    if (
      submission.profileImage &&
      submission.profileImage.startsWith("/uploads/")
    ) {
      filesToDelete.push(submission.profileImage);
    }
    if (
      submission.coverImage &&
      submission.coverImage.startsWith("/uploads/")
    ) {
      filesToDelete.push(submission.coverImage);
    }
    if (
      submission.resumePath &&
      submission.resumePath.startsWith("/uploads/")
    ) {
      filesToDelete.push(submission.resumePath);
    }

    // Delete work files
    if (submission.works && submission.works.length > 0) {
      submission.works.forEach((work) => {
        if (work.url && work.url.startsWith("/uploads/")) {
          filesToDelete.push(work.url);
        }
      });
    }

    // Delete service video files
    if (submission.services && submission.services.length > 0) {
      submission.services.forEach((service) => {
        if (service.videos && service.videos.length > 0) {
          service.videos.forEach((video) => {
            if (video.url && video.url.startsWith("/uploads/")) {
              filesToDelete.push(video.url);
            }
          });
        }
      });
    }

    // Clean up files from filesystem
    filesToDelete.forEach((filePath) => {
      try {
        const fullPath = path.join(__dirname, filePath.replace(/^\/+/, ""));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Deleted file: ${fullPath}`);
        }
      } catch (err) {
        console.error(`Error deleting file ${filePath}:`, err);
      }
    });

    // Delete the portfolio submission from database
    await PortfolioSubmission.findByIdAndDelete(id);

    console.log(`Portfolio submission ${id} deleted successfully`);

    res.status(200).json({
      success: true,
      message: "Portfolio submission deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting portfolio submission:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete portfolio submission",
      error: error.message,
    });
  }
});

// PUT - Hold/Unhold portfolio submission
app.put("/api/admin/portfolio-submission/:id/hold", async (req, res) => {
  try {
    const { id } = req.params;
    const { isHold } = req.body;

    console.log(
      `${isHold ? "Holding" : "Unholding"} portfolio submission:`,
      id
    );

    const submission = await PortfolioSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Portfolio submission not found",
      });
    }

    // Add isHold field to the submission
    submission.isHold = isHold;
    submission.updatedDate = new Date();

    await submission.save();

    console.log(
      `Portfolio submission ${id} ${isHold ? "held" : "unheld"} successfully`
    );

    res.status(200).json({
      success: true,
      message: `Portfolio submission ${
        isHold ? "held" : "unheld"
      } successfully`,
      submission: submission,
    });
  } catch (error) {
    console.error("Error updating hold status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update hold status",
      error: error.message,
    });
  }
});

app.get("/api/admin/migrate-hold-field", async (req, res) => {
  try {
    console.log("Starting migration to add isHold field...");

    // Add isHold field to existing portfolio submissions that don't have it
    const result = await PortfolioSubmission.updateMany(
      { isHold: { $exists: false } },
      { $set: { isHold: false } }
    );

    console.log(
      `Migration completed. Modified ${result.modifiedCount} documents.`
    );

    // Also log some sample documents to verify
    const sampleDocs = await PortfolioSubmission.find(
      {},
      { name: 1, isHold: 1, status: 1 }
    ).limit(5);
    console.log("Sample documents after migration:", sampleDocs);

    res.status(200).json({
      success: true,
      message: "Migration completed successfully",
      modifiedCount: result.modifiedCount,
      sampleDocs: sampleDocs,
    });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({
      success: false,
      error: "Migration failed",
      details: error.message,
    });
  }
});

// PUT - Toggle recommended status for portfolio submission
app.put("/api/admin/portfolio-submission/:id/recommend", async (req, res) => {
  try {
    const { id } = req.params;
    const { isRecommended } = req.body;

    console.log(
      `${isRecommended ? "Adding to" : "Removing from"} recommended:`,
      id
    );

    const submission = await PortfolioSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Portfolio submission not found",
      });
    }

    // Explicitly set the isRecommended field
    submission.isRecommended = Boolean(isRecommended);
    submission.updatedDate = new Date();

    // Mark the field as modified to ensure MongoDB saves it
    submission.markModified("isRecommended");

    await submission.save();

    // Verify the save was successful
    const updatedSubmission = await PortfolioSubmission.findById(id);
    console.log(
      `Portfolio ${id} recommendation status updated to ${updatedSubmission.isRecommended}`
    );

    res.status(200).json({
      success: true,
      message: `Portfolio ${
        isRecommended ? "added to" : "removed from"
      } recommended successfully`,
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error("Error updating recommendation status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update recommendation status",
      error: error.message,
    });
  }
});

app.get("/api/admin/fix-recommended-field", async (req, res) => {
  try {
    console.log("Fixing isRecommended field for all portfolios...");

    // Set isRecommended to false for all portfolios that don't have this field
    const result = await PortfolioSubmission.updateMany(
      { isRecommended: { $exists: false } },
      { $set: { isRecommended: false } }
    );

    console.log(`Fixed ${result.modifiedCount} portfolios`);

    res.status(200).json({
      success: true,
      message: "isRecommended field fixed successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error fixing isRecommended field:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fix isRecommended field",
      details: error.message,
    });
  }
});

// Quick Booking Routes

app.use("/api/quick-booking*", (req, res, next) => {
  console.log(`=== QUICK BOOKING ROUTE HIT ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log(`Base URL: ${req.baseUrl}`);
  console.log(`Path: ${req.path}`);
  console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
  if (req.method !== "GET") {
    console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);
  }
  next();
});

// POST - Create Quick Booking

app.post("/api/quick-booking", async (req, res) => {
  try {
    console.log("=== QUICK BOOKING REQUEST ===");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("URL:", req.originalUrl);
    console.log("Method:", req.method);

    const {
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      serviceName,
      budget,
      description,
    } = req.body;

    console.log("Creating quick booking with parsed data:", {
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      serviceName,
      budget,
      description,
    });

    // Validate required fields
    if (
      !clientId ||
      !clientName ||
      !clientEmail ||
      !clientPhone ||
      !serviceName ||
      !budget
    ) {
      const missingFields = [];
      if (!clientId) missingFields.push("clientId");
      if (!clientName) missingFields.push("clientName");
      if (!clientEmail) missingFields.push("clientEmail");
      if (!clientPhone) missingFields.push("clientPhone");
      if (!serviceName) missingFields.push("serviceName");
      if (!budget) missingFields.push("budget");

      console.log("Validation failed - missing fields:", missingFields);

      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        received: {
          clientId,
          clientName,
          clientEmail,
          clientPhone,
          serviceName,
          budget,
        },
        missingFields: missingFields,
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      console.log("Invalid ObjectId format:", clientId);
      return res.status(400).json({
        success: false,
        message: "Invalid client ID format",
      });
    }

    // Validate user exists
    const client = await User.findById(clientId);
    if (!client) {
      console.log("Client not found:", clientId);
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    console.log("Client validated successfully:", client.name);

    // Create new quick booking
    const newQuickBooking = new QuickBooking({
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      serviceName,
      budget,
      description: description || "",
      status: "pending",
      requestDate: new Date(),
      type: "quick_booking",
    });

    console.log("Attempting to save quick booking...");
    const savedQuickBooking = await newQuickBooking.save();
    console.log("Quick booking saved successfully:", savedQuickBooking._id);

    res.status(201).json({
      success: true,
      message: "Quick booking request submitted successfully",
      quickBooking: savedQuickBooking,
    });
  } catch (error) {
    console.error("=== QUICK BOOKING CREATION ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    res.status(500).json({
      success: false,
      message: "Failed to create quick booking request",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

console.log("Quick booking POST route registered successfully");

// GET - Get all quick bookings for admin
app.get("/api/admin/quick-bookings", async (req, res) => {
  try {
    console.log("Fetching all quick bookings for admin");

    const quickBookings = await QuickBooking.find({})
      .sort({ requestDate: -1 })
      .populate("clientId", "name email profileImage voatId");

    console.log(`Found ${quickBookings.length} quick bookings`);

    // Calculate stats
    const stats = {
      total: quickBookings.length,
      pending: quickBookings.filter((qb) => qb.status === "pending").length,
      accepted: quickBookings.filter((qb) => qb.status === "accepted").length,
      rejected: quickBookings.filter((qb) => qb.status === "rejected").length,
    };

    res.status(200).json({
      success: true,
      quickBookings: quickBookings,
      stats: stats,
    });
  } catch (error) {
    console.error("Error fetching quick bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quick bookings",
      error: error.message,
    });
  }
});

// PUT - Update quick booking status
app.put("/api/admin/quick-booking/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    console.log(`Updating quick booking ${id} status to ${status}`);

    if (!["pending", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const quickBooking = await QuickBooking.findById(id);

    if (!quickBooking) {
      return res.status(404).json({
        success: false,
        message: "Quick booking not found",
      });
    }

    // Update status and notes
    quickBooking.status = status;
    quickBooking.responseDate = new Date();
    if (adminNotes) {
      quickBooking.adminNotes = adminNotes;
    }

    const updatedQuickBooking = await quickBooking.save();

    console.log(`Quick booking ${id} status updated to ${status}`);

    res.status(200).json({
      success: true,
      message: "Quick booking status updated successfully",
      quickBooking: updatedQuickBooking,
    });
  } catch (error) {
    console.error("Error updating quick booking status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update quick booking status",
      error: error.message,
    });
  }
});

// GET - Get quick booking details
app.get("/api/admin/quick-booking/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Fetching quick booking details:", id);

    const quickBooking = await QuickBooking.findById(id).populate(
      "clientId",
      "name email profileImage voatId phone"
    );

    if (!quickBooking) {
      return res.status(404).json({
        success: false,
        message: "Quick booking not found",
      });
    }

    res.status(200).json({
      success: true,
      quickBooking: quickBooking,
    });
  } catch (error) {
    console.error("Error fetching quick booking details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quick booking details",
      error: error.message,
    });
  }
});

// DELETE - Delete quick booking
app.delete("/api/admin/quick-booking/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Deleting quick booking:", id);

    const quickBooking = await QuickBooking.findById(id);

    if (!quickBooking) {
      return res.status(404).json({
        success: false,
        message: "Quick booking not found",
      });
    }

    await QuickBooking.findByIdAndDelete(id);

    console.log(`Quick booking ${id} deleted successfully`);

    res.status(200).json({
      success: true,
      message: "Quick booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quick booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete quick booking",
      error: error.message,
    });
  }
});

// GET - Get quick booking statistics
app.get("/api/admin/quick-booking-stats", async (req, res) => {
  try {
    console.log("Fetching quick booking statistics");

    const totalCount = await QuickBooking.countDocuments();
    const pendingCount = await QuickBooking.countDocuments({
      status: "pending",
    });
    const acceptedCount = await QuickBooking.countDocuments({
      status: "accepted",
    });
    const rejectedCount = await QuickBooking.countDocuments({
      status: "rejected",
    });

    // Get recent quick bookings
    const recentBookings = await QuickBooking.find({})
      .sort({ requestDate: -1 })
      .limit(5)
      .populate("clientId", "name email profileImage");

    // Get service distribution
    const serviceDistribution = await QuickBooking.aggregate([
      {
        $group: {
          _id: "$serviceName",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const stats = {
      total: totalCount,
      pending: pendingCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
      recentBookings: recentBookings,
      serviceDistribution: serviceDistribution,
      acceptanceRate:
        totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0,
    };

    console.log("Quick booking stats:", stats);

    res.status(200).json({
      success: true,
      stats: stats,
    });
  } catch (error) {
    console.error("Error fetching quick booking statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quick booking statistics",
      error: error.message,
    });
  }
});

// Add this test route to your backend
app.get("/api/test-quick-booking", async (req, res) => {
  try {
    const count = await QuickBooking.countDocuments();
    res.json({
      message: "Quick booking model is working",
      count: count,
      modelExists: !!QuickBooking,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      modelExists: !!QuickBooking,
    });
  }
});

console.log("✅ Quick Booking API endpoints loaded successfully");

app.get("/api/quick-booking-test", (req, res) => {
  res.json({
    message: "Quick booking routes are accessible",
    timestamp: new Date().toISOString(),
    method: "GET",
  });
});

// Also add a test POST route
app.post("/api/quick-booking-test", (req, res) => {
  res.json({
    message: "Quick booking POST route is working",
    body: req.body,
    timestamp: new Date().toISOString(),
  });
});

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
    const workFile = req.file;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    if (!workFile) {
      return res
        .status(400)
        .json({ success: false, message: "No work file provided" });
    } // Prepare the data for the new work item

    const workData = {
      url: `/uploads/${workFile.filename}`, // For images, thumbnail is the image itself. Videos will get a placeholder on the frontend.
      thumbnail: workFile.mimetype.startsWith("image/")
        ? `/uploads/${workFile.filename}`
        : "",
      title: title || workFile.originalname,
      type: workFile.mimetype.startsWith("video/") ? "video" : "image",
      serviceName: serviceName || "",
      uploadedDate: new Date(),
    }; // Find the user's portfolio and push the new work item. // `upsert: true` creates a new portfolio document if one doesn't exist.

    const updatedPortfolio = await PortfolioSubmission.findOneAndUpdate(
      { userId: userId },
      { $push: { works: workData } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!updatedPortfolio) {
      throw new Error("Could not save portfolio work.");
    } // Get the ID of the item we just added

    const newWork = updatedPortfolio.works[updatedPortfolio.works.length - 1];

    res.status(201).json({
      success: true,
      message: "Work added successfully",
      workId: newWork._id,
      workUrl: newWork.url,
      workThumbnail: newWork.thumbnail,
      workType: newWork.type,
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

    console.log("=== FETCHING USER DATA ===");
    console.log("User ID:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Fetch user data from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("User found:", user.name, "Profile Image:", user.profileImage);

    // Get the user's portfolio submission if it exists
    const portfolio = await PortfolioSubmission.findOne({ userId: userId });

    if (portfolio && !portfolio.headline && portfolio.profession) {
      portfolio.headline = portfolio.profession;
      await portfolio.save();
    }

    // Extract services and works from portfolio for easier access in frontend
    const services = portfolio?.services || [];
    const works = portfolio?.works || [];

    // Format works for frontend consumption
    const formattedWorks = works.map((work) => ({
      id: work._id,
      url: work.url,
      thumbnail: work.thumbnail || work.url,
      title: work.title,
      type: work.type,
      serviceName: work.serviceName,
      uploadedDate: work.uploadedDate,
    }));

    // Prepare complete user data response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profession: user.profession,
      phone: user.phone,
      profileImage: user.profileImage,
      voatId: user.voatId,
      voatPoints: user.voatPoints,
      badge: user.badge,
    };

    console.log(
      "Sending user data with profile image:",
      userResponse.profileImage
    );

    // Return user data with their portfolio information including works
    res.status(200).json({
      success: true,
      user: userResponse,
      portfolio: portfolio || null,
      services: services,
      works: formattedWorks, // Include works in the response
      worksCount: formattedWorks.length, // Add count for convenience
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

app.get("/api/debug/users-voat", async (req, res) => {
  try {
    const users = await User.find({}, { name: 1, email: 1, voatId: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Fetch user's wishlist
app.get("/api/wishlist/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching wishlist for user:", userId);

    // Set headers to prevent caching
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    const wishlist = await Wishlist.findOne({ userId: userId });

    if (!wishlist) {
      console.log("No wishlist found, returning empty array");
      return res.status(200).json([]);
    }

    console.log(
      `Returning ${wishlist.items.length} wishlist items for user ${userId}`
    );
    res.status(200).json(wishlist.items || []);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

// POST - Update user's entire wishlist
app.post("/api/wishlist/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const wishlistItems = req.body;

    console.log("Updating wishlist for user:", userId);
    console.log("New wishlist items:", wishlistItems.length);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    if (!Array.isArray(wishlistItems)) {
      return res.status(400).json({
        success: false,
        error: "Wishlist data must be an array",
      });
    }

    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { userId: userId },
      { $set: { items: wishlistItems } },
      { new: true, upsert: true }
    );

    console.log("Wishlist updated successfully");

    res.status(200).json({
      success: true,
      message: "Wishlist updated successfully",
      count: updatedWishlist.items.length,
    });
  } catch (error) {
    console.error("Error updating wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

// POST - Add single item to wishlist
app.post("/api/wishlist/:userId/add", async (req, res) => {
  try {
    const { userId } = req.params;
    const newItem = req.body;

    console.log("Adding item to wishlist for user:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    // Ensure the item has required fields
    if (!newItem.service || !newItem.provider) {
      return res.status(400).json({
        success: false,
        error: "Service name and provider are required",
      });
    }

    // Add ID and timestamp if not present
    if (!newItem.id) {
      newItem.id = `wishlist_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }
    if (!newItem.addedDate) {
      newItem.addedDate = new Date();
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId: userId },
      {
        $push: { items: newItem },
        $setOnInsert: { userId: userId },
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Item added to wishlist",
      item: newItem,
      totalItems: wishlist.items.length,
    });
  } catch (error) {
    console.error("Error adding item to wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

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

// ===== CART API ENDPOINTS =====

console.log("Registering cart routes...");

// Test endpoint to verify cart routes are working
app.get("/api/cart/test", (req, res) => {
  console.log("Cart test endpoint hit");
  res.json({ message: "Cart routes are working", timestamp: new Date() });
});

// Debugging middleware for cart routes
app.use("/api/cart*", (req, res, next) => {
  console.log(`=== CART ROUTE HIT ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
  if (req.method !== "GET") {
    console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);
  }
  next();
});

// GET - Get user's cart items=
app.get("/api/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("=== CART FETCH REQUEST ===");
    console.log("User ID:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find the user's cart
    let cart = await Cart.findOne({ userId })
      .populate("items.freelancerId", "name email profileImage voatId")
      .populate("userId", "name email");

    if (!cart) {
      // Create empty cart if doesn't exist
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    console.log(`Found ${cart.items.length} items in cart for user ${userId}`);

    return res.status(200).json({
      success: true,
      data: cart.items || [],
      count: cart.items.length,
    });
  } catch (error) {
    console.error("=== CART FETCH ERROR ===", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart items",
      error: error.message,
    });
  }
});

// POST - Add item to cart
app.post("/api/cart/add", async (req, res) => {
  try {
    const {
      userId,
      freelancerId,
      freelancerName,
      freelancerProfileImage,
      serviceName,
      serviceLevel,
      basePrice,
      paymentType = "final", // default to full payment
    } = req.body;

    console.log("=== CART ADD REQUEST ===");
    console.log("Request body:", req.body);
    console.log("Headers:", req.headers);

    // Validate required fields
    if (
      !userId ||
      !freelancerId ||
      !serviceName ||
      !serviceLevel ||
      !basePrice
    ) {
      console.log("Missing required fields");
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
        received: {
          userId,
          freelancerId,
          serviceName,
          serviceLevel,
          basePrice,
        },
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(freelancerId)
    ) {
      console.log("Invalid ObjectId format");
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or freelancer ID format",
      });
    }

    // Check if freelancer exists
    const freelancer = await User.findById(freelancerId);
    if (!freelancer) {
      console.log("Freelancer not found:", freelancerId);
      return res.status(404).json({
        success: false,
        message: "Freelancer not found",
      });
    }

    // Calculate payment amount based on type
    let paymentAmount = basePrice;
    let paymentDescription = "Full Payment";

    switch (paymentType) {
      case "advance":
        paymentAmount = basePrice * 0.3;
        paymentDescription = "30% Advance Payment";
        break;
      case "middle":
        paymentAmount = basePrice * 0.5;
        paymentDescription = "50% Partial Payment";
        break;
      case "final":
        paymentAmount = basePrice;
        paymentDescription = "100% Full Payment";
        break;
      default:
        paymentAmount = basePrice;
        paymentDescription = "Full Payment";
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if service already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.freelancerId.toString() === freelancerId &&
        item.serviceName === serviceName &&
        item.serviceLevel === serviceLevel
    );

    if (existingItemIndex >= 0) {
      console.log("Service already in cart");
      return res.status(409).json({
        success: false,
        message: "This service is already in your cart",
      });
    }

    // Create new cart item
    const newItem = {
      freelancerId,
      freelancerName: freelancerName || freelancer.name,
      freelancerProfileImage: freelancerProfileImage || freelancer.profileImage,
      serviceName,
      serviceLevel,
      basePrice: parseFloat(basePrice),
      selectedPaymentAmount: paymentAmount,
      paymentStructure: {
        type: paymentType,
        amount: paymentAmount,
        description: paymentDescription,
      },
      addedDate: new Date(),
    };

    // Add item to cart
    cart.items.push(newItem);
    await cart.save();

    // ✅ CREATE NOTIFICATION FOR CART ADD
    await createNotification({
      userId: userId,
      type: "system",
      title: "Service Added to Cart",
      message: `"${serviceName}" has been added to your cart`,
      relatedId: cart._id.toString(),
      metadata: {
        action: "cart_add",
        serviceName,
        freelancerName,
        serviceLevel,
        price: basePrice,
      },
    });

    console.log(`Item added to cart successfully for user ${userId}`);

    return res.status(201).json({
      success: true,
      message: "Service added to cart successfully",
      cartItemCount: cart.items.length,
    });
  } catch (error) {
    console.error("=== CART ADD ERROR ===", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add service to cart",
      error: error.message,
    });
  }
});

// PUT - Update payment structure for cart item
app.put("/api/cart/update-payment", async (req, res) => {
  try {
    const { userId, itemId, paymentStructure } = req.body;

    console.log("Updating payment structure:", {
      userId,
      itemId,
      paymentStructure,
    });

    if (!userId || !itemId || !paymentStructure) {
      return res.status(400).json({
        success: false,
        message: "User ID, item ID, and payment structure are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or item ID format",
      });
    }

    // Find the cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Find the item in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Update the payment structure
    cart.items[itemIndex].paymentStructure = paymentStructure;
    cart.items[itemIndex].selectedPaymentAmount = paymentStructure.amount;

    cart.markModified("items");
    await cart.save();

    console.log(`Payment structure updated for item ${itemId}`);

    res.status(200).json({
      success: true,
      message: "Payment structure updated successfully",
      updatedItem: cart.items[itemIndex],
    });
  } catch (error) {
    console.error("Error updating payment structure:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment structure",
      error: error.message,
    });
  }
});

// DELETE - Remove item from cart
app.delete("/api/cart/remove", async (req, res) => {
  try {
    const { userId, itemId } = req.body;

    console.log("=== CART REMOVE REQUEST ===");
    console.log("User ID:", userId, "Item ID:", itemId);

    if (!userId || !itemId) {
      return res.status(400).json({
        success: false,
        message: "User ID and item ID are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or item ID format",
      });
    }

    // Find the cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Find and remove the item
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Remove the item
    cart.items.splice(itemIndex, 1);
    await cart.save();

    console.log(`Item ${itemId} removed from cart for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      remainingItems: cart.items.length,
    });
  } catch (error) {
    console.error("=== CART REMOVE ERROR ===", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
      error: error.message,
    });
  }
});

// DELETE - Clear entire cart
app.delete("/api/cart/clear/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("=== CART CLEAR REQUEST ===");
    console.log("User ID:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find and clear the cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = [];
    await cart.save();

    console.log(`Cart cleared for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    console.error("=== CART CLEAR ERROR ===", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message,
    });
  }
});

// GET - Get cart statistics
app.get("/api/cart/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching cart stats for user:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart || !cart.items.length) {
      return res.status(200).json({
        success: true,
        stats: {
          totalItems: 0,
          totalAmount: 0,
          uniqueFreelancers: 0,
          paymentBreakdown: {
            advance: 0,
            middle: 0,
            final: 0,
            custom: 0,
          },
        },
      });
    }

    // Calculate statistics
    const totalItems = cart.items.length;
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.selectedPaymentAmount,
      0
    );
    const uniqueFreelancers = new Set(
      cart.items.map((item) => item.freelancerId.toString())
    ).size;

    const paymentBreakdown = {
      advance: cart.items.filter(
        (item) => item.paymentStructure.type === "advance"
      ).length,
      middle: cart.items.filter(
        (item) => item.paymentStructure.type === "middle"
      ).length,
      final: cart.items.filter((item) => item.paymentStructure.type === "final")
        .length,
      custom: cart.items.filter(
        (item) => item.paymentStructure.type === "custom"
      ).length,
    };

    const stats = {
      totalItems,
      totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
      uniqueFreelancers,
      paymentBreakdown,
    };

    console.log("Cart stats:", stats);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching cart stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart statistics",
      error: error.message,
    });
  }
});

// GET - Check if specific service is in cart
app.get("/api/cart/check/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { freelancerId, serviceName, serviceLevel } = req.query;

    console.log("Checking if service in cart:", {
      userId,
      freelancerId,
      serviceName,
      serviceLevel,
    });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart || !cart.items.length) {
      return res.status(200).json({
        success: true,
        inCart: false,
      });
    }

    // Check if the specific service is in cart
    const isInCart = cart.items.some(
      (item) =>
        item.freelancerId.toString() === freelancerId &&
        item.serviceName === serviceName &&
        item.serviceLevel === serviceLevel
    );

    res.status(200).json({
      success: true,
      inCart: isInCart,
    });
  } catch (error) {
    console.error("Error checking cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check cart",
      error: error.message,
    });
  }
});

// Admin endpoint to get all carts (for debugging/admin purposes)
app.get("/api/admin/all-carts", async (req, res) => {
  try {
    console.log("Fetching all carts for admin");

    const carts = await Cart.find({})
      .populate("userId", "name email voatId")
      .populate("items.freelancerId", "name email voatId")
      .sort({ updatedAt: -1 });

    const cartsWithStats = carts.map((cart) => ({
      ...cart.toObject(),
      totalItems: cart.items.length,
      totalAmount: cart.items.reduce(
        (sum, item) => sum + item.selectedPaymentAmount,
        0
      ),
    }));

    console.log(`Found ${carts.length} carts`);

    res.status(200).json({
      success: true,
      carts: cartsWithStats,
      totalCarts: carts.length,
    });
  } catch (error) {
    console.error("Error fetching all carts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch all carts",
      error: error.message,
    });
  }
});

app.post("/api/cart/checkout", async (req, res) => {
  try {
    const { userId, selectedItems } = req.body;

    console.log("=== CART CHECKOUT REQUEST ===");
    console.log("User ID:", userId);
    console.log("Selected Items:", selectedItems);

    if (!userId || !selectedItems || !Array.isArray(selectedItems)) {
      return res.status(400).json({
        success: false,
        message: "User ID and selected items are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ userId });
    if (!cart || !cart.items.length) {
      return res.status(200).json({
        success: true,
        message: "Cart is already empty",
        orders: [],
        remainingCartItems: 0,
      });
    }

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove checked out items from cart
    const originalItemCount = cart.items.length;
    cart.items = cart.items.filter(
      (item) => !selectedItems.includes(item._id.toString())
    );

    await cart.save();

    const removedItemCount = originalItemCount - cart.items.length;

    console.log(
      `=== CHECKOUT SUCCESS: ${removedItemCount} items removed from cart ===`
    );

    res.status(200).json({
      success: true,
      message: `Checkout successful! ${removedItemCount} items removed from cart.`,
      removedItems: removedItemCount,
      remainingCartItems: cart.items.length,
    });
  } catch (error) {
    console.error("=== CART CHECKOUT ERROR ===", error);
    res.status(500).json({
      success: false,
      message: "Failed to process checkout",
      error: error.message,
    });
  }
});

console.log("✅ Cart API endpoints loaded successfully");

// Development debugging endpoints
if (process.env.NODE_ENV === "development") {
  // Debug endpoint to clear all carts
  app.delete("/api/debug/clear-all-carts", async (req, res) => {
    try {
      await Cart.deleteMany({});
      res.json({ message: "All carts cleared" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to create sample cart
  app.post("/api/debug/create-sample-cart", async (req, res) => {
    try {
      const users = await User.find({}).limit(3);
      if (users.length < 2) {
        return res.status(400).json({ message: "Need at least 2 users" });
      }

      const sampleCart = new Cart({
        userId: users[0]._id,
        items: [
          {
            freelancerId: users[1]._id,
            freelancerName: users[1].name,
            freelancerProfileImage: users[1].profileImage,
            serviceName: "Web Development",
            serviceLevel: "Premium",
            basePrice: 5000,
            selectedPaymentAmount: 1500,
            paymentStructure: {
              type: "advance",
              amount: 1500,
              description: "30% Advance Payment",
            },
          },
        ],
      });

      await sampleCart.save();
      res.json({ message: "Sample cart created", cart: sampleCart });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

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

    // Create notification for the freelancer
    await createNotification({
      userId: freelancerId,
      type: "booking",
      title: "New Booking Request",
      message: `You have received a new booking request from ${clientName} for "${serviceName}"`,
      relatedId: savedBooking._id.toString(),
      metadata: {
        bookingId: savedBooking._id,
        clientName,
        serviceName,
        servicePrice,
      },
    });

    // Create notification for the client
    await createNotification({
      userId: clientId,
      type: "system",
      title: "Booking Request Sent",
      message: `Your booking request has been sent to ${freelancerName} for "${serviceName}"`,
      relatedId: savedBooking._id.toString(),
      metadata: {
        bookingId: savedBooking._id,
        freelancerName,
        serviceName,
        servicePrice,
      },
    });

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

console.log("✅ Notification API endpoints loaded successfully");

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

// Get My Bookings (booking requests made by current user as client)
app.get("/api/my-bookings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("=== FETCHING MY BOOKINGS ===");
    console.log("User ID:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find all bookings where the current user is the CLIENT (bookings they made)
    const myBookings = await Booking.find({ clientId: userId })
      .sort({ requestDate: -1 })
      .populate("freelancerId", "name email profileImage")
      .lean();

    console.log(`Found ${myBookings.length} bookings made by user ${userId}`);

    // Format the bookings for frontend
    const formattedBookings = myBookings.map((booking) => {
      return {
        _id: booking._id,
        serviceName: booking.serviceName,
        freelancerId: booking.freelancerId?._id || booking.freelancerId,
        freelancerName: booking.freelancerName,
        freelancerEmail: booking.freelancerEmail,
        freelancerProfileImage: booking.freelancerId?.profileImage || null,
        servicePrice: booking.servicePrice,
        status: booking.status,
        requestDate: booking.requestDate,
        responseDate: booking.responseDate,
        notes: booking.notes || "",
      };
    });

    res.status(200).json(formattedBookings);
  } catch (error) {
    console.error("Error fetching my bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch my bookings",
      error: error.message,
    });
  }
});

// NEW: Get My Orders (actual paid orders made by current user)
app.get("/api/my-orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching my orders for user:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find actual PAID orders where current user is the client
    const myOrders = await Order.find({ clientId: userId })
      .sort({ orderDate: -1 })
      .populate("freelancerId", "name email profileImage");

    console.log(`Found ${myOrders.length} paid orders made by user ${userId}`);

    // Format for My Orders section
    const formattedOrders = myOrders.map((order, index) => ({
      id: `ORD-${String(index + 1).padStart(3, "0")}`,
      service: order.serviceName,
      status: order.status, // pending, in-progress, completed, cancelled
      date: order.orderDate.toISOString().split("T")[0],
      amount: order.totalAmount,
      provider: order.freelancerName,
      providerImage: order.freelancerId?.profileImage || null,
      providerEmail: order.freelancerEmail,
      providerId: order.freelancerId?._id || order.freelancerId,
      orderId: order._id,
      orderDate: order.orderDate,
      completedDate: order.completedDate,
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching my orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch my orders",
      error: error.message,
    });
  }
});

// Get Bookings for Client (orders)
// Get Orders for Client (My Orders - actual paid orders)
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

    // First, try to find actual orders from the Order collection
    let orders = await Order.find({ clientId: userId })
      .sort({ orderDate: -1 })
      .populate("freelancerId", "name email profileImage");

    console.log(`Found ${orders.length} actual orders for client ${userId}`);

    // If no actual orders found, fallback to accepted bookings
    if (orders.length === 0) {
      console.log(
        "No orders found, checking for accepted bookings as fallback"
      );

      const acceptedBookings = await Booking.find({
        clientId: userId,
        status: { $in: ["accepted", "completed"] },
      })
        .sort({ requestDate: -1 })
        .populate("freelancerId", "name email profileImage");

      // Transform accepted bookings to order format
      const formattedBookingOrders = acceptedBookings.map((booking, index) => ({
        id: `ORD-${String(index + 1).padStart(3, "0")}`,
        service: booking.serviceName,
        status: booking.status === "accepted" ? "In Progress" : "Completed",
        date: booking.requestDate.toISOString().split("T")[0],
        amount: booking.servicePrice,
        provider: booking.freelancerName,
        providerImage: booking.freelancerId?.profileImage || null,
        providerEmail: booking.freelancerEmail,
        providerId: booking.freelancerId?._id || booking.freelancerId,
        bookingId: booking._id,
        orderType: "booking",
      }));

      return res.status(200).json(formattedBookingOrders);
    }

    // Format actual orders
    const formattedOrders = orders.map((order, index) => ({
      id: `ORD-${String(index + 1).padStart(3, "0")}`,
      service: order.serviceName,
      status:
        order.status === "pending"
          ? "Pending"
          : order.status === "in-progress"
          ? "In Progress"
          : order.status === "completed"
          ? "Completed"
          : order.status === "cancelled"
          ? "Cancelled"
          : order.status,
      date: order.orderDate.toISOString().split("T")[0],
      amount: order.totalAmount,
      provider: order.freelancerName,
      providerImage: order.freelancerId?.profileImage || null,
      providerEmail: order.freelancerEmail,
      providerId: order.freelancerId?._id || order.freelancerId,
      orderId: order._id,
      orderType: "order",
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

// Booking Status (Accept/Reject)
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

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: `Booking has already been ${booking.status}`,
      });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";
    booking.status = newStatus;
    booking.responseDate = new Date();

    const updatedBooking = await booking.save();

    // Create notification for the client
    await createNotification({
      userId: booking.clientId,
      type: "booking",
      title: `Booking Request ${action === "accept" ? "Accepted" : "Rejected"}`,
      message: `Your booking request for "${booking.serviceName}" has been ${action}ed by ${booking.freelancerName}`,
      relatedId: booking._id.toString(),
      metadata: {
        bookingId: booking._id,
        serviceName: booking.serviceName,
        freelancerName: booking.freelancerName,
        action: action,
        timestamp: new Date().toISOString(),
      },
    });

    // Create notification for the freelancer
    await createNotification({
      userId: booking.freelancerId,
      type: "system",
      title: `Booking Request ${action === "accept" ? "Accepted" : "Rejected"}`,
      message: `You have ${action}ed the booking request from ${booking.clientName} for "${booking.serviceName}"`,
      relatedId: booking._id.toString(),
      metadata: {
        bookingId: booking._id,
        serviceName: booking.serviceName,
        clientName: booking.clientName,
        action: action,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`Booking ${bookingId} successfully ${action}ed`);

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

    // FIX: Allow cancellation of both pending and accepted bookings
    // Only prevent cancellation of completed or already rejected bookings
    if (booking.status === "completed" || booking.status === "rejected") {
      return res.status(409).json({
        success: false,
        message: `Cannot cancel a booking that has been ${booking.status}`,
      });
    }

    await Booking.findByIdAndDelete(bookingId);

    // Create notifications for both parties
    if (booking.clientId.toString() !== userId) {
      // Notify client if freelancer cancelled
      await createNotification({
        userId: booking.clientId,
        type: "booking",
        title: "Booking Cancelled",
        message: `Your booking for "${booking.serviceName}" has been cancelled by ${booking.freelancerName}`,
        relatedId: booking._id.toString(),
        metadata: {
          bookingId: booking._id,
          serviceName: booking.serviceName,
          freelancerName: booking.freelancerName,
          action: "cancelled_by_freelancer",
        },
      });
    }

    if (booking.freelancerId.toString() !== userId) {
      // Notify freelancer if client cancelled
      await createNotification({
        userId: booking.freelancerId,
        type: "booking",
        title: "Booking Cancelled",
        message: `The booking for "${booking.serviceName}" has been cancelled by ${booking.clientName}`,
        relatedId: booking._id.toString(),
        metadata: {
          bookingId: booking._id,
          serviceName: booking.serviceName,
          clientName: booking.clientName,
          action: "cancelled_by_client",
        },
      });
    }

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

// Test endpoint for my-bookings
app.get("/api/test-my-bookings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const bookingCount = await Booking.countDocuments({ clientId: userId });

    res.json({
      success: true,
      message: "My bookings endpoint is working",
      userId: userId,
      bookingCount: bookingCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

console.log("✅ Booking API endpoints loaded successfully");

// debugging routes
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

// Create a new order
app.post("/api/orders/create", async (req, res) => {
  try {
    const {
      clientId,
      freelancerId,
      serviceName,
      serviceLevel,
      totalAmount,
      clientName,
      clientEmail,
      freelancerName,
      freelancerEmail,
      paymentStatus = "paid",
    } = req.body;

    console.log("=== ORDER CREATION REQUEST ===");
    console.log("Request body:", req.body);
    console.log("Client ID:", clientId, "Type:", typeof clientId);
    console.log("Freelancer ID:", freelancerId, "Type:", typeof freelancerId);

    // Validate required fields
    if (!clientId || !freelancerId || !serviceName || !totalAmount) {
      console.log("Missing required fields");
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: clientId, freelancerId, serviceName, totalAmount",
        received: {
          clientId: !!clientId,
          freelancerId: !!freelancerId,
          serviceName: !!serviceName,
          totalAmount: !!totalAmount,
        },
      });
    }

    // Validate ObjectIds with better error messages
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      console.log("Invalid client ID format:", clientId);
      return res.status(400).json({
        success: false,
        message: `Invalid client ID format: ${clientId}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      console.log("Invalid freelancer ID format:", freelancerId);
      return res.status(400).json({
        success: false,
        message: `Invalid freelancer ID format: ${freelancerId}`,
      });
    }

    // Get client and freelancer details
    const client = await User.findById(clientId);
    const freelancer = await User.findById(freelancerId);

    if (!client) {
      console.log("Client not found:", clientId);
      return res.status(404).json({
        success: false,
        message: `Client not found with ID: ${clientId}`,
      });
    }

    if (!freelancer) {
      console.log("Freelancer not found:", freelancerId);
      return res.status(404).json({
        success: false,
        message: `Freelancer not found with ID: ${freelancerId}`,
      });
    }

    console.log("Client found:", client.name);
    console.log("Freelancer found:", freelancer.name);

    const newOrder = new Order({
      clientId,
      clientName: clientName || client.name,
      clientEmail: clientEmail || client.email,
      freelancerId,
      freelancerName: freelancerName || freelancer.name,
      freelancerEmail: freelancerEmail || freelancer.email,
      serviceName,
      serviceLevel: serviceLevel || "Standard",
      totalAmount: parseFloat(totalAmount),
      status: "pending",
      paymentStatus: paymentStatus,
      orderDate: new Date(),
    });

    const savedOrder = await newOrder.save();
    console.log("Order saved successfully:", savedOrder._id);

    // Create notifications
    try {
      await createNotification({
        userId: freelancerId,
        type: "order",
        title: "New Order Received",
        message: `You have received a new order from ${client.name} for "${serviceName}"`,
        relatedId: savedOrder._id.toString(),
        metadata: {
          orderId: savedOrder._id,
          clientName: client.name,
          serviceName,
          totalAmount,
        },
      });

      await createNotification({
        userId: clientId,
        type: "order",
        title: "Order Placed Successfully",
        message: `Your order for "${serviceName}" has been placed successfully`,
        relatedId: savedOrder._id.toString(),
        metadata: {
          orderId: savedOrder._id,
          freelancerName: freelancer.name,
          serviceName,
          totalAmount,
        },
      });
    } catch (notificationError) {
      console.error("Error creating notifications:", notificationError);
    }

    res.status(201).json({
      success: true,
      order: savedOrder,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
});

// Get orders for a client (My Orders)
app.get("/api/orders/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    console.log("Fetching orders for client:", clientId);

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID format",
      });
    }

    // First, try to find actual orders from Order collection
    const actualOrders = await Order.find({ clientId: clientId })
      .sort({ orderDate: -1 })
      .populate("freelancerId", "name email profileImage");

    console.log(
      `Found ${actualOrders.length} actual orders for client ${clientId}`
    );

    if (actualOrders.length > 0) {
      // Transform actual orders to match UI format
      const formattedOrders = actualOrders.map((order, index) => ({
        id: `ORD-${String(index + 1).padStart(3, "0")}`,
        service: order.serviceName,
        status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        date: order.orderDate.toISOString().split("T")[0],
        amount: order.totalAmount,
        provider: order.freelancerName,
        providerImage: order.freelancerId?.profileImage || null,
        providerEmail: order.freelancerEmail,
        providerId: order.freelancerId?._id || order.freelancerId,
        orderId: order._id,
        orderType: "order",
        paymentStatus: order.paymentStatus,
      }));

      return res.json(formattedOrders);
    }

    // Fallback to bookings if no actual orders found
    const acceptedBookings = await Booking.find({
      clientId: clientId,
      status: { $in: ["accepted", "completed"] },
    })
      .sort({ requestDate: -1 })
      .populate("freelancerId", "name email profileImage");

    const formattedBookingOrders = acceptedBookings.map((booking, index) => ({
      id: `ORD-${String(index + 1).padStart(3, "0")}`,
      service: booking.serviceName,
      status: booking.status === "accepted" ? "In Progress" : "Completed",
      date: booking.requestDate.toISOString().split("T")[0],
      amount: booking.servicePrice,
      provider: booking.freelancerName,
      providerImage: booking.freelancerId?.profileImage || null,
      providerEmail: booking.freelancerEmail,
      providerId: booking.freelancerId?._id || booking.freelancerId,
      bookingId: booking._id,
      orderType: "booking",
      paymentStatus: "pending",
    }));

    res.json(formattedBookingOrders);
  } catch (error) {
    console.error("Error fetching client orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
});

app.get("/api/orders/freelancer/:freelancerId", async (req, res) => {
  try {
    const { freelancerId } = req.params;

    console.log("=== FETCHING FREELANCER ORDERS (DEBUG) ===");
    console.log("Freelancer ID:", freelancerId);

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid freelancer ID format",
      });
    }

    // Find ONLY actual paid orders where user is the freelancer
    const receivedOrders = await Order.find({
      freelancerId: freelancerId,
      paymentStatus: "paid", // Only paid orders
    })
      .sort({ orderDate: -1 })
      .populate("clientId", "name email profileImage");

    console.log(
      `Found ${receivedOrders.length} paid orders for freelancer ${freelancerId}`
    );

    // Debug: Log the raw order data
    receivedOrders.forEach((order, index) => {
      console.log(`Raw Order ${index + 1}:`, {
        _id: order._id,
        id: order.id,
        serviceName: order.serviceName,
        status: order.status,
        clientName: order.clientName,
        totalAmount: order.totalAmount,
        orderDate: order.orderDate,
      });
    });

    const formattedOrders = receivedOrders.map((order, index) => {
      const formatted = {
        _id: order._id, // This is the MongoDB ObjectId - CRITICAL for API calls
        id: `RCV-${String(index + 1).padStart(3, "0")}`, // Display ID only
        serviceName: order.serviceName,
        clientId: order.clientId?._id || order.clientId,
        clientName: order.clientName,
        clientEmail: order.clientEmail,
        clientProfileImage: order.clientId?.profileImage || null,
        servicePrice: order.totalAmount, // Note: using totalAmount from Order model
        status: order.status,
        requestDate: order.orderDate, // Note: using orderDate from Order model
        responseDate: order.updatedAt,
        orderType: "order",
        paymentStatus: order.paymentStatus,
        serviceLevel: order.serviceLevel || "Standard",
      };

      console.log(`Formatted Order ${index + 1}:`, formatted);
      return formatted;
    });

    console.log("Sending formatted orders:", formattedOrders.length);

    res.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching freelancer orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// Update order status
app.put("/api/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, freelancerId } = req.body;

    console.log(`=== UPDATING ORDER STATUS ===`);
    console.log("Order ID:", orderId);
    console.log("New Status:", status);
    console.log("Freelancer ID:", freelancerId);
    console.log("Request body:", req.body);

    // Validate required fields
    if (!orderId) {
      console.log("❌ Missing order ID");
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!status) {
      console.log("❌ Missing status");
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Validate status
    const validStatuses = [
      "pending",
      "accepted",
      "in-progress",
      "completed",
      "cancelled",
      "rejected",
    ];
    if (!validStatuses.includes(status)) {
      console.log("❌ Invalid status:", status);
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        receivedStatus: status,
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.log("❌ Invalid ObjectId format:", orderId);
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
        receivedOrderId: orderId,
      });
    }

    // Find the order
    console.log("🔍 Finding order...");
    const order = await Order.findById(orderId);

    if (!order) {
      console.log("❌ Order not found:", orderId);
      return res.status(404).json({
        success: false,
        message: "Order not found",
        searchedOrderId: orderId,
      });
    }

    console.log("✅ Order found:", {
      id: order._id,
      currentStatus: order.status,
      freelancerId: order.freelancerId,
      serviceName: order.serviceName,
    });

    // Security check - only the freelancer can update their received orders
    if (freelancerId && order.freelancerId.toString() !== freelancerId) {
      console.log("❌ Authorization failed:", {
        orderFreelancerId: order.freelancerId.toString(),
        requestFreelancerId: freelancerId,
      });
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this order",
      });
    }

    // Store previous status for logging
    const previousStatus = order.status;
    console.log(`📝 Updating status from "${previousStatus}" to "${status}"`);

    // Update the order
    order.status = status;
    if (notes) {
      order.notes = notes;
      console.log("📝 Added notes:", notes);
    }
    if (status === "completed") {
      order.completedDate = new Date();
      console.log("📅 Set completion date");
    }

    // Save the order
    console.log("💾 Saving order...");
    const updatedOrder = await order.save();
    console.log("✅ Order saved successfully");

    // Create notifications
    try {
      console.log("📢 Creating notifications...");

      // Notification for the client
      let clientMessage = "";
      let clientTitle = "";

      switch (status) {
        case "accepted":
          clientTitle = "Order Accepted";
          clientMessage = `Your order for "${order.serviceName}" has been accepted by ${order.freelancerName}`;
          break;
        case "rejected":
          clientTitle = "Order Declined";
          clientMessage = `Your order for "${order.serviceName}" has been declined by ${order.freelancerName}`;
          break;
        case "completed":
          clientTitle = "Order Completed";
          clientMessage = `Your order for "${order.serviceName}" has been marked as completed by ${order.freelancerName}`;
          break;
        case "in-progress":
          clientTitle = "Order In Progress";
          clientMessage = `Work has started on your order for "${order.serviceName}"`;
          break;
        default:
          clientTitle = "Order Status Updated";
          clientMessage = `Your order for "${order.serviceName}" status has been updated to ${status}`;
      }

      // Create client notification
      await createNotification({
        userId: order.clientId,
        type: "order",
        title: clientTitle,
        message: clientMessage,
        relatedId: order._id.toString(),
        metadata: {
          orderId: order._id,
          serviceName: order.serviceName,
          freelancerName: order.freelancerName,
          previousStatus,
          newStatus: status,
          timestamp: new Date().toISOString(),
        },
      });

      // Notification for the freelancer (confirmation)
      let freelancerMessage = "";
      let freelancerTitle = "";

      switch (status) {
        case "accepted":
          freelancerTitle = "Order Accepted";
          freelancerMessage = `You have accepted the order from ${order.clientName} for "${order.serviceName}"`;
          break;
        case "rejected":
          freelancerTitle = "Order Declined";
          freelancerMessage = `You have declined the order from ${order.clientName} for "${order.serviceName}"`;
          break;
        case "completed":
          freelancerTitle = "Order Marked Complete";
          freelancerMessage = `You have marked the order from ${order.clientName} for "${order.serviceName}" as completed`;
          break;
        default:
          freelancerTitle = "Order Status Updated";
          freelancerMessage = `You have updated the order status for "${order.serviceName}" to ${status}`;
      }

      // Create freelancer notification
      await createNotification({
        userId: order.freelancerId,
        type: "system",
        title: freelancerTitle,
        message: freelancerMessage,
        relatedId: order._id.toString(),
        metadata: {
          orderId: order._id,
          serviceName: order.serviceName,
          clientName: order.clientName,
          action: status,
          timestamp: new Date().toISOString(),
        },
      });

      console.log("✅ Notifications created successfully");
    } catch (notificationError) {
      console.error(
        "⚠️ Error creating notifications (non-critical):",
        notificationError
      );
      // Don't fail the status update for notification errors
    }

    console.log(
      `✅ Order ${orderId} status updated successfully from ${previousStatus} to ${status}`
    );

    // Send success response
    res.json({
      success: true,
      message: `Order status updated to ${status} successfully`,
      order: {
        _id: updatedOrder._id,
        status: updatedOrder.status,
        previousStatus,
        serviceName: updatedOrder.serviceName,
        clientName: updatedOrder.clientName,
        freelancerName: updatedOrder.freelancerName,
      },
      previousStatus,
      newStatus: status,
    });
  } catch (error) {
    console.error("❌ CRITICAL ERROR updating order status:", error);
    console.error("Error stack:", error.stack);

    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
      details:
        process.env.NODE_ENV === "development"
          ? {
              stack: error.stack,
              receivedData: {
                orderId: req.params.orderId,
                body: req.body,
              },
            }
          : undefined,
    });
  }
});

app.get("/api/orders/:orderId/details", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.query;

    console.log("Fetching order details:", orderId, "for user:", userId);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    const order = await Order.findById(orderId)
      .populate("clientId", "name email profileImage voatId phone")
      .populate("freelancerId", "name email profileImage voatId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Security check - only client or freelancer can view details
    if (
      userId &&
      order.clientId._id.toString() !== userId &&
      order.freelancerId._id.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this order",
      });
    }

    res.status(200).json({
      success: true,
      order: order,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
});

// Bulk status update for multiple orders (admin feature)
app.put("/api/orders/bulk-update", async (req, res) => {
  try {
    const { orderIds, status, freelancerId } = req.body;

    console.log(`=== BULK ORDER STATUS UPDATE ===`);
    console.log("Order IDs:", orderIds);
    console.log("New Status:", status);

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs array is required",
      });
    }

    if (
      ![
        "pending",
        "accepted",
        "in-progress",
        "completed",
        "cancelled",
        "rejected",
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // Validate all order IDs
    const invalidIds = orderIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format(s)",
        invalidIds,
      });
    }

    // Find all orders
    const orders = await Order.find({
      _id: { $in: orderIds },
      ...(freelancerId && { freelancerId: freelancerId }),
    });

    if (orders.length !== orderIds.length) {
      return res.status(404).json({
        success: false,
        message: "Some orders not found or not authorized",
      });
    }

    const updateData = { status };
    if (status === "completed") {
      updateData.completedDate = new Date();
    }

    // Bulk update
    const result = await Order.updateMany(
      {
        _id: { $in: orderIds },
        ...(freelancerId && { freelancerId: freelancerId }),
      },
      updateData
    );

    console.log(`Bulk updated ${result.modifiedCount} orders to ${status}`);

    res.json({
      success: true,
      message: `${result.modifiedCount} orders updated to ${status}`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error bulk updating orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk update orders",
      error: error.message,
    });
  }
});

app.get("/api/orders/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    console.log("=== FETCHING CLIENT ORDERS ===");
    console.log("Client ID:", clientId);

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID format",
      });
    }

    // Fetch ONLY actual paid orders from Order collection
    const orders = await Order.find({
      clientId: clientId,
      paymentStatus: "paid", // Only paid orders
    })
      .sort({ orderDate: -1 })
      .populate("freelancerId", "name email profileImage");

    console.log(`Found ${orders.length} paid orders for client ${clientId}`);

    // Transform orders to match UI format
    const formattedOrders = orders.map((order, index) => ({
      id: `ORD-${String(index + 1).padStart(3, "0")}`,
      service: order.serviceName,
      status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
      date: order.orderDate.toISOString().split("T")[0],
      amount: order.totalAmount,
      provider: order.freelancerName,
      providerImage: order.freelancerId?.profileImage || null,
      providerEmail: order.freelancerEmail,
      providerId: order.freelancerId?._id || order.freelancerId,
      orderId: order._id,
      orderType: "order",
      paymentStatus: order.paymentStatus,
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching client orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

app.get("/api/orders/freelancer/:freelancerId", async (req, res) => {
  try {
    const { freelancerId } = req.params;

    console.log("=== FETCHING FREELANCER ORDERS ===");
    console.log("Freelancer ID:", freelancerId);

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid freelancer ID format",
      });
    }

    // Find ONLY actual paid orders where user is the freelancer
    const receivedOrders = await Order.find({
      freelancerId: freelancerId,
      paymentStatus: "paid", // Only paid orders
    })
      .sort({ orderDate: -1 })
      .populate("clientId", "name email profileImage");

    console.log(
      `Found ${receivedOrders.length} paid orders for freelancer ${freelancerId}`
    );

    const formattedOrders = receivedOrders.map((order, index) => ({
      _id: order._id,
      id: `RCV-${String(index + 1).padStart(3, "0")}`,
      serviceName: order.serviceName,
      clientId: order.clientId?._id || order.clientId,
      clientName: order.clientName,
      clientEmail: order.clientEmail,
      clientProfileImage: order.clientId?.profileImage || null,
      servicePrice: order.totalAmount,
      status: order.status,
      requestDate: order.orderDate,
      responseDate: order.updatedAt,
      orderType: "order",
      paymentStatus: order.paymentStatus,
      serviceLevel: order.serviceLevel || "Standard",
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching freelancer orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// Get order statistics
app.get("/api/orders/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query; // "client" or "freelancer"

    let stats = {};

    if (userType === "freelancer") {
      // Stats for freelancer (orders received)
      const receivedOrders = await Order.find({ freelancerId: userId });
      const totalEarned = receivedOrders
        .filter((order) => order.status === "completed")
        .reduce((sum, order) => sum + order.totalAmount, 0);

      stats = {
        totalReceived: receivedOrders.length,
        activeOrders: receivedOrders.filter((order) =>
          ["pending", "accepted", "in-progress"].includes(order.status)
        ).length,
        completedOrders: receivedOrders.filter(
          (order) => order.status === "completed"
        ).length,
        totalEarned,
      };
    } else {
      // Stats for client (orders placed)
      const placedOrders = await Order.find({ clientId: userId });
      const totalSpent = placedOrders
        .filter((order) => order.status === "completed")
        .reduce((sum, order) => sum + order.totalAmount, 0);

      stats = {
        totalPlaced: placedOrders.length,
        activeOrders: placedOrders.filter((order) =>
          ["pending", "accepted", "in-progress"].includes(order.status)
        ).length,
        completedOrders: placedOrders.filter(
          (order) => order.status === "completed"
        ).length,
        totalSpent,
      };
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics",
    });
  }
});

app.get("/api/orders-received/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching orders received by freelancer:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find bookings where user is the freelancer (orders they received)
    const receivedOrders = await Booking.find({ freelancerId: userId })
      .sort({ requestDate: -1 })
      .populate("clientId", "name email profileImage");

    console.log(
      `Found ${receivedOrders.length} orders received by freelancer ${userId}`
    );

    const formattedOrders = receivedOrders.map((booking) => ({
      _id: booking._id,
      clientId: booking.clientId,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientProfileImage:
        booking.clientId?.profileImage || booking.clientProfileImage,
      serviceName: booking.serviceName,
      servicePrice: booking.servicePrice,
      status: booking.status,
      requestDate: booking.requestDate,
      responseDate: booking.responseDate,
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching received orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch received orders",
      error: error.message,
    });
  }
});

console.log("✅ Orders API endpoints loaded successfully");

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

// Helper function to create notifications
const createNotification = async (notificationData) => {
  try {
    const notification = new Notification({
      ...notificationData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await notification.save();
    console.log("✅ Notification created successfully:", {
      id: notification._id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
    });

    return notification;
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    return null;
  }
};

// GET - Fetch notifications for a user
app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching notifications for user:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Get only the 10 most recent notifications
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name email");

    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
    });

    // Format notifications to match frontend expectations
    const formattedNotifications = notifications.map((notification) => ({
      id: notification._id,
      type: notification.type,
      message: notification.message,
      title: notification.title,
      time: notification.createdAt.toISOString(),
      read: notification.read,
      relatedId: notification.relatedId,
      metadata: notification.metadata,
    }));

    console.log(
      `Returning ${formattedNotifications.length} notifications for user ${userId}`
    );

    res.status(200).json({
      success: true,
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

// PUT - Mark notification as read
app.put("/api/notifications/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;

    console.log("Marking notification as read:", notificationId);

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID format",
      });
    }

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification: {
        id: notification._id,
        read: notification.read,
      },
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
});

// PUT - Mark all notifications as read for a user
app.put("/api/notifications/:userId/read-all", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Marking all notifications as read for user:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
});

// DELETE - Delete notification
app.delete("/api/notifications/:notificationId", async (req, res) => {
  try {
    const { notificationId } = req.params;

    console.log("Deleting notification:", notificationId);

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID format",
      });
    }

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
});

app.post(
  "/api/portfolio/add-work",
  workUpload.single("workFile"),
  async (req, res) => {
    try {
      const { userId, title, serviceName } = req.body;
      const workFile = req.file;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!workFile) {
        return res.status(400).json({
          success: false,
          message: "No work file provided",
        });
      }

      // FIXED: Consistent URL storage format
      const workData = {
        url: `/uploads/${workFile.filename}`, // Ensure leading slash
        thumbnail: workFile.mimetype.startsWith("image/")
          ? `/uploads/${workFile.filename}`
          : "",
        title: title || workFile.originalname.split(".")[0],
        type: workFile.mimetype.startsWith("video/") ? "video" : "image",
        serviceName: serviceName || "",
        uploadedDate: new Date(),
      };

      const updatedPortfolio = await PortfolioSubmission.findOneAndUpdate(
        { userId: userId },
        { $push: { works: workData } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!updatedPortfolio) {
        throw new Error("Could not save portfolio work.");
      }

      const newWork = updatedPortfolio.works[updatedPortfolio.works.length - 1];

      res.status(201).json({
        success: true,
        message: "Work added successfully",
        workId: newWork._id,
        workUrl: newWork.url, // Return relative path
        workThumbnail: newWork.thumbnail,
        workType: newWork.type,
      });
    } catch (error) {
      console.error("Error adding work:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to add work",
      });
    }
  }
);

// Add a route to remove work from portfolio
app.delete("/api/portfolio/remove-work", async (req, res) => {
  try {
    const { userId, workId } = req.body;

    if (!userId || !workId) {
      return res.status(400).json({
        success: false,
        message: "User ID and work ID are required",
      });
    }

    // Find the portfolio and remove the work item
    const portfolio = await PortfolioSubmission.findOne({ userId });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    if (!portfolio.works || portfolio.works.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No works found in portfolio",
      });
    }

    // Find the work item
    const workIndex = portfolio.works.findIndex(
      (work) => work._id.toString() === workId
    );

    if (workIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Work not found",
      });
    }

    // Get the work URL before removing it to delete the file
    const workUrl = portfolio.works[workIndex].url;

    // Remove the work from the array
    portfolio.works.splice(workIndex, 1);
    await portfolio.save();

    // Clean up the file if it exists
    if (workUrl && !workUrl.startsWith("http")) {
      try {
        const fullPath = path.join(__dirname, workUrl.replace(/^\/+/, ""));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Deleted work file: ${fullPath}`);
        }
      } catch (err) {
        console.error("Error deleting work file:", err);
      }
    }

    res.status(200).json({
      success: true,
      message: "Work removed successfully",
      remainingWorks: portfolio.works.length,
    });
  } catch (error) {
    console.error("Error removing work:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove work",
    });
  }
});

// Add route to get works by service name
app.get("/api/portfolio/:userId/works/:serviceName?", async (req, res) => {
  try {
    const { userId, serviceName } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const portfolio = await PortfolioSubmission.findOne({ userId });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    let works = portfolio.works || [];

    // Filter by service name if provided
    if (serviceName && serviceName !== "all") {
      works = works.filter(
        (work) =>
          work.serviceName &&
          work.serviceName.toLowerCase() === serviceName.toLowerCase()
      );
    }

    const formattedWorks = works.map((work) => ({
      id: work._id,
      url: work.url,
      thumbnail: work.thumbnail || work.url,
      title: work.title,
      type: work.type,
      serviceName: work.serviceName,
      uploadedDate: work.uploadedDate,
    }));

    res.status(200).json({
      success: true,
      works: formattedWorks,
      count: formattedWorks.length,
      serviceName: serviceName || "all",
    });
  } catch (error) {
    console.error("Error fetching works:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch works",
      error: error.message,
    });
  }
});

// =====  RAZORPAY PAYMENT ENDPOINTS =====

// Create Razorpay Order
app.post("/api/payment/create-razorpay-order", async (req, res) => {
  try {
    const { userId, amount, currency = "INR", items } = req.body;

    console.log("=== CREATE RAZORPAY ORDER ===");
    console.log("User ID:", userId);
    console.log("Amount:", amount);

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: "User ID and amount are required",
      });
    }

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum payment amount is ₹1",
      });
    }

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${userId.slice(-4)}`;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount, // Amount in paise
      currency: currency,
      receipt: orderId,
      notes: {
        userId: userId,
        itemCount: items ? items.length : 0,
      },
    });

    // Save transaction to database
    const transaction = new PaymentTransaction({
      userId,
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: amount / 100, // Store in rupees
      currency,
      status: "created",
      paymentMethod: "razorpay",
      items: items || [],
    });

    await transaction.save();

    console.log("Razorpay order created:", razorpayOrder.id);

    res.status(200).json({
      success: true,
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: orderId,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: error.message,
    });
  }
});

// Verify Razorpay Payment
app.post("/api/payment/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      userId,
      cartItems, // Add this parameter
    } = req.body;

    console.log("=== VERIFY PAYMENT REQUEST ===");
    console.log("Payment ID:", razorpay_payment_id);
    console.log("Order ID:", razorpay_order_id);
    console.log("User ID:", userId);
    console.log("Cart Items received:", cartItems);

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification parameters",
      });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      await PaymentTransaction.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          status: "failed",
          failureReason: "Invalid signature",
        }
      );

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Update transaction in database
    const transaction = await PaymentTransaction.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: payment.status === "captured" ? "paid" : "attempted",
        paymentMethod: payment.method,
        metadata: {
          bank: payment.bank,
          wallet: payment.wallet,
          vpa: payment.vpa,
        },
      },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // CREATE ORDERS FROM CART ITEMS - ONLY IF PAYMENT IS CAPTURED
    if (payment.status === "captured" && cartItems && cartItems.length > 0) {
      console.log("=== STARTING ORDER CREATION ===");

      const user = await User.findById(userId);
      if (!user) {
        console.error("User not found:", userId);
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      console.log("User found:", user.name);

      const createdOrders = [];
      const failedOrders = [];

      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];

        try {
          console.log(
            `=== PROCESSING CART ITEM ${i + 1}/${cartItems.length} ===`
          );
          console.log("Raw item data:", item);

          // Extract freelancer ID properly
          let freelancerId = item.freelancerId;

          // Handle different freelancerId formats
          if (typeof freelancerId === "object" && freelancerId !== null) {
            if (freelancerId._id) {
              freelancerId = freelancerId._id;
            } else if (freelancerId.id) {
              freelancerId = freelancerId.id;
            } else if (freelancerId.$oid) {
              freelancerId = freelancerId.$oid;
            } else {
              freelancerId = freelancerId.toString();
            }
          }

          // From originalData if available
          if (item.originalData && item.originalData.freelancerId) {
            freelancerId = item.originalData.freelancerId;
          }

          console.log("Extracted freelancerId:", freelancerId);
          console.log("FreelancerId type:", typeof freelancerId);

          // Validate freelancer ID format
          if (!freelancerId || !mongoose.Types.ObjectId.isValid(freelancerId)) {
            console.error(`Invalid freelancer ID format: ${freelancerId}`);
            failedOrders.push({
              item: item,
              error: `Invalid freelancer ID format: ${freelancerId}`,
            });
            continue;
          }

          // Get freelancer details
          const freelancer = await User.findById(freelancerId);
          if (!freelancer) {
            console.error(`Freelancer not found: ${freelancerId}`);
            failedOrders.push({
              item: item,
              error: `Freelancer not found: ${freelancerId}`,
            });
            continue;
          }

          console.log("Freelancer found:", freelancer.name);

          // Prepare order data
          const serviceName =
            item.originalData?.serviceName || item.serviceName || item.category;
          const serviceLevel =
            item.originalData?.serviceLevel || item.serviceLevel || "Standard";
          const totalAmount = parseFloat(
            item.originalData?.selectedPaymentAmount ||
              item.selectedPaymentAmount ||
              item.price ||
              item.basePrice
          );
          const freelancerName =
            item.originalData?.freelancerName ||
            item.freelancerName ||
            item.seller ||
            freelancer.name;

          // Validate required fields
          if (!serviceName || !totalAmount || isNaN(totalAmount)) {
            console.error("Missing required order data:", {
              serviceName,
              totalAmount,
              freelancerName,
            });
            failedOrders.push({
              item: item,
              error: "Missing required order data",
            });
            continue;
          }

          const orderData = {
            clientId: userId,
            clientName: user.name,
            clientEmail: user.email,
            freelancerId: freelancerId,
            freelancerName: freelancerName,
            freelancerEmail: freelancer.email,
            serviceName: serviceName,
            serviceLevel: serviceLevel,
            totalAmount: totalAmount,
            status: "pending",
            paymentStatus: "paid",
            orderDate: new Date(),
          };

          console.log("Creating order with data:", orderData);

          // Create order
          const newOrder = new Order(orderData);
          const savedOrder = await newOrder.save();
          createdOrders.push(savedOrder);

          console.log(`Order created successfully: ${savedOrder._id}`);

          // Create notification for freelancer
          try {
            await createNotification({
              userId: freelancerId,
              type: "order",
              title: "New Order Received",
              message: `You have received a new paid order from ${user.name} for "${serviceName}"`,
              relatedId: savedOrder._id.toString(),
              metadata: {
                orderId: savedOrder._id,
                clientName: user.name,
                serviceName: serviceName,
                amount: totalAmount,
                paymentId: razorpay_payment_id,
              },
            });

            // Create notification for client
            await createNotification({
              userId: userId,
              type: "order",
              title: "Order Placed Successfully",
              message: `Your order for "${serviceName}" has been placed and payment confirmed`,
              relatedId: savedOrder._id.toString(),
              metadata: {
                orderId: savedOrder._id,
                freelancerName: freelancerName,
                serviceName: serviceName,
                amount: totalAmount,
              },
            });

            console.log("Notifications created successfully");
          } catch (notificationError) {
            console.error("Error creating notifications:", notificationError);
            // Don't fail the order creation for notification errors
          }
        } catch (orderError) {
          console.error("Error creating individual order:", orderError);
          console.error("Failed item:", item);
          failedOrders.push({
            item: item,
            error: orderError.message,
          });
        }
      }

      console.log(`=== ORDER CREATION SUMMARY ===`);
      console.log(`Total items: ${cartItems.length}`);
      console.log(`Orders created: ${createdOrders.length}`);
      console.log(`Orders failed: ${failedOrders.length}`);

      if (failedOrders.length > 0) {
        console.log("Failed orders:", failedOrders);
      }

      // Clear cart items that were successfully converted to orders
      if (createdOrders.length > 0) {
        try {
          // Remove items from cart based on the items that were successfully processed
          const successfulItemIds = cartItems
            .filter(
              (_, index) =>
                index <
                createdOrders.length +
                  failedOrders.filter((f, i) => i < index).length
            )
            .map((item) => item.id || item._id);

          console.log("Removing cart items with IDs:", successfulItemIds);

          const cartUpdateResult = await Cart.findOneAndUpdate(
            { userId: userId },
            {
              $pull: {
                items: {
                  _id: {
                    $in: successfulItemIds.filter((id) =>
                      mongoose.Types.ObjectId.isValid(id)
                    ),
                  },
                },
              },
            },
            { new: true }
          );

          console.log(
            "Cart update result:",
            cartUpdateResult ? "Success" : "Failed"
          );
        } catch (cartError) {
          console.error("Error clearing cart:", cartError);
          // Don't fail the entire operation for cart clearing errors
        }
      }

      // Store order creation results in transaction metadata
      await PaymentTransaction.findByIdAndUpdate(transaction._id, {
        $set: {
          "metadata.ordersCreated": createdOrders.length,
          "metadata.ordersFailed": failedOrders.length,
          "metadata.orderIds": createdOrders.map((order) => order._id),
        },
      });
    }

    // Create notification for successful payment
    await createNotification({
      userId: userId,
      type: "payment",
      title: "Payment Successful",
      message: `Your payment of ₹${transaction.amount} has been processed successfully`,
      relatedId: transaction._id.toString(),
      metadata: {
        paymentId: razorpay_payment_id,
        amount: transaction.amount,
        method: payment.method,
      },
    });

    console.log("Payment verified successfully:", razorpay_payment_id);

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      transaction: transaction,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
});

// Simple webhook endpoint
app.post(
  "/api/payment/webhook/razorpay",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const webhookSignature = req.headers["x-razorpay-signature"];
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      console.log("🔔 Webhook received from Razorpay");

      if (!webhookSecret) {
        console.error("❌ Webhook secret not configured");
        return res.status(500).send("Webhook secret not configured");
      }

      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.body)
        .digest("hex");

      if (expectedSignature !== webhookSignature) {
        console.error("❌ Invalid webhook signature");
        return res.status(400).send("Invalid signature");
      }

      const event = JSON.parse(req.body);
      console.log("✅ Webhook verified, event:", event.event);

      res.status(200).send("OK");
    } catch (error) {
      console.error("❌ Webhook error:", error);
      res.status(500).send("Webhook error");
    }
  }
);

// Add this endpoint to your backend
app.post("/api/orders/create-from-payment", async (req, res) => {
  try {
    const { userId, cartItems, paymentId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const createdOrders = [];

    for (const item of cartItems) {
      const freelancer = await User.findById(item.freelancerId);
      if (!freelancer) continue;

      const newOrder = new Order({
        clientId: userId,
        clientName: user.name,
        clientEmail: user.email,
        freelancerId: item.freelancerId,
        freelancerName: item.freelancerName,
        freelancerEmail: freelancer.email,
        serviceName: item.serviceName,
        serviceLevel: item.serviceLevel,
        totalAmount: item.selectedPaymentAmount,
        status: "pending",
        paymentStatus: "paid",
        orderDate: new Date(),
      });

      const savedOrder = await newOrder.save();
      createdOrders.push(savedOrder);
    }

    // Clear cart
    await Cart.findOneAndUpdate({ userId: userId }, { $set: { items: [] } });

    res.status(200).json({
      success: true,
      orders: createdOrders,
      message: "Orders created successfully",
    });
  } catch (error) {
    console.error("Error creating orders from payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create orders",
      error: error.message,
    });
  }
});

// Add this endpoint to retry order creation
app.post("/api/orders/retry-from-payment", async (req, res) => {
  try {
    const { userId, paymentId } = req.body;

    // Find the payment transaction
    const transaction = await PaymentTransaction.findOne({
      userId: userId,
      razorpayPaymentId: paymentId,
      status: "paid",
    });

    if (!transaction || !transaction.items) {
      return res.status(404).json({
        success: false,
        message: "Payment transaction or items not found",
      });
    }

    // Get cart items at the time of payment
    const cartItems = JSON.parse(
      localStorage.getItem("checkout_items") || "[]"
    );

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No cart items found for order creation",
      });
    }

    // Try to create orders again
    const response = await fetch(
      `${this.baseUrl}/api/orders/create-from-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          cartItems,
          paymentId,
        }),
      }
    );

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error("Error retrying order creation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retry order creation",
      error: error.message,
    });
  }
});

console.log("✅ Razorpay Payment API endpoints loaded successfully");

app.get("/api/test-razorpay", (req, res) => {
  res.json({
    razorpay_configured: !!process.env.RAZORPAY_KEY_ID,
    key_id: process.env.RAZORPAY_KEY_ID,
    webhook_secret_configured: !!process.env.RAZORPAY_WEBHOOK_SECRET,
    server_time: new Date().toISOString(),
  });
});

// Get user's current storage usage
app.get("/api/portfolio/:userId/storage-info", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const currentSize = await calculateUserWorksSize(userId);
    const maxSize = 50 * 1024 * 1024; // 50MB
    const remainingSize = maxSize - currentSize;

    res.status(200).json({
      success: true,
      currentSize: currentSize,
      currentSizeMB: (currentSize / (1024 * 1024)).toFixed(2),
      maxSize: maxSize,
      maxSizeMB: 50,
      remainingSize: remainingSize,
      remainingSizeMB: (remainingSize / (1024 * 1024)).toFixed(2),
      usagePercentage: ((currentSize / maxSize) * 100).toFixed(1),
    });
  } catch (error) {
    console.error("Error getting storage info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get storage information",
    });
  }
});

app.get("/api/debug/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log("=== DEBUG ORDER ENDPOINT ===");
    console.log("Requested Order ID:", orderId);
    console.log("Order ID type:", typeof orderId);
    console.log("Is valid ObjectId:", mongoose.Types.ObjectId.isValid(orderId));

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.json({
        error: "Invalid ObjectId format",
        receivedId: orderId,
        expectedFormat: "MongoDB ObjectId (24 hex characters)",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.json({
        error: "Order not found",
        searchedId: orderId,
        suggestion: "Check if the order exists in the database",
      });
    }

    res.json({
      success: true,
      order: {
        _id: order._id,
        status: order.status,
        serviceName: order.serviceName,
        clientId: order.clientId,
        freelancerId: order.freelancerId,
        clientName: order.clientName,
        freelancerName: order.freelancerName,
        totalAmount: order.totalAmount,
        orderDate: order.orderDate,
        paymentStatus: order.paymentStatus,
      },
      metadata: {
        canUpdate: true,
        validStatuses: [
          "pending",
          "accepted",
          "in-progress",
          "completed",
          "cancelled",
          "rejected",
        ],
        currentStatus: order.status,
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({
      error: "Debug endpoint failed",
      message: error.message,
      stack: error.stack,
    });
  }
});

// Debug endpoint to check if uploaded files exist
app.get("/api/debug/check-file/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "uploads", filename);

  const exists = fs.existsSync(filePath);

  if (exists) {
    const stats = fs.statSync(filePath);
    res.json({
      exists: true,
      path: filePath,
      size: stats.size,
      modified: stats.mtime,
      accessible: true,
    });
  } else {
    res.json({
      exists: false,
      path: filePath,
      suggestion: "File may have been deleted or never uploaded properly",
    });
  }
});

// Debug endpoint to check VOAT IDs for all users
app.get("/api/debug/check-voat-ids", async (req, res) => {
  try {
    const users = await User.find({}, { name: 1, email: 1, voatId: 1 });
    const usersWithVoatId = users.filter((user) => user.voatId);
    const usersWithoutVoatId = users.filter((user) => !user.voatId);

    res.status(200).json({
      total: users.length,
      withVoatId: usersWithVoatId.length,
      withoutVoatId: usersWithoutVoatId.length,
      usersWithoutVoatId: usersWithoutVoatId.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/fix-portfolio-data", async (req, res) => {
  try {
    console.log("Starting portfolio data fix...");

    // Fix missing isHold field
    const holdResult = await PortfolioSubmission.updateMany(
      { isHold: { $exists: false } },
      { $set: { isHold: false } }
    );

    // Fix missing isRecommended field
    const recommendedResult = await PortfolioSubmission.updateMany(
      { isRecommended: { $exists: false } },
      { $set: { isRecommended: false } }
    );

    // Fix missing status field (set to pending if missing)
    const statusResult = await PortfolioSubmission.updateMany(
      { status: { $exists: false } },
      { $set: { status: "pending" } }
    );

    // Fix missing headline field (copy from profession)
    const headlineResult = await PortfolioSubmission.updateMany(
      {
        $and: [
          { headline: { $exists: false } },
          { profession: { $exists: true, $ne: null, $ne: "" } },
        ],
      },
      [{ $set: { headline: "$profession" } }]
    );

    // Fix missing profession field (copy from headline)
    const professionResult = await PortfolioSubmission.updateMany(
      {
        $and: [
          { profession: { $exists: false } },
          { headline: { $exists: true, $ne: null, $ne: "" } },
        ],
      },
      [{ $set: { profession: "$headline" } }]
    );

    res.json({
      message: "Portfolio data fix completed",
      results: {
        holdFieldsFixed: holdResult.modifiedCount,
        recommendedFieldsFixed: recommendedResult.modifiedCount,
        statusFieldsFixed: statusResult.modifiedCount,
        headlineFieldsFixed: headlineResult.modifiedCount,
        professionFieldsFixed: professionResult.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error fixing portfolio data:", error);
    res.status(500).json({ error: error.message });
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

    // check for portfolios without profession
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

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    mongoConnection:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
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

// Validate Razorpay configuration
const validateRazorpayConfig = () => {
  const requiredEnvVars = {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  };

  const missing = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error("❌ Missing Razorpay environment variables:", missing);
    return false;
  }

  console.log("✅ Razorpay configuration validated");
  return true;
};

// Validate on startup
validateRazorpayConfig();

//Global error handler middleware
app.use((err, req, res, next) => {
  console.error("=== GLOBAL ERROR HANDLER ===");
  console.error("Error:", err);
  console.error("Request URL:", req.url);
  console.error("Request Method:", req.method);

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  if (!res.headersSent) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: isDevelopment ? err.message : "Something went wrong",
      ...(isDevelopment && { stack: err.stack }),
    });
  }
});

// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

console.log("=== REGISTERED ROUTES ===");
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(
      `${Object.keys(middleware.route.methods)[0].toUpperCase()} ${
        middleware.route.path
      }`
    );
  } else if (middleware.name === "router") {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log(
          `${Object.keys(handler.route.methods)[0].toUpperCase()} ${
            handler.route.path
          }`
        );
      }
    });
  }
});

app.use("*", (req, res) => {
  console.log(`=== 404 ERROR ===`);
  console.log(`Route not found: ${req.method} ${req.originalUrl}`);
  console.log(`Headers:`, req.headers);

  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      "GET /api/health",
      "GET /api/status",
      "GET /api/user/:userId",
      "GET /api/cart/:userId",
      "POST /api/cart/add",
      "POST /api/cart/checkout",
      "DELETE /api/cart/remove",
    ],
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
