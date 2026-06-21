
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { google } = require("googleapis");

async function appendToGoogleSheet(data) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'arbitrage.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    const spreadsheetId = '1fdRd2sZvU-UKO3XEqFDJFWhH7UIVHlt31WwBkvoSGkk';
    
    const formatDate = (d) => {
      if (!d) return '';
      const date = new Date(d);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    };

    const formatPurchases = (purchases) => {
      if (!purchases || !purchases.length) return '';
      return purchases.map(p => `${p.sellerName}: ${p.volumeEuro} EUR @ ${p.rateEuro} = ${p.usdcAmount.toFixed(2)} USDC`).join(' | ');
    };

    const formatSales = (sales) => {
      if (!sales || !sales.length) return '';
      return sales.map(s => `${s.buyerName}: ${s.usdtAmount.toFixed(2)} USDT @ ${s.rateInr} = ${s.volumeInr} INR`).join(' | ');
    };

    const values = [
      [
        formatDate(data.date), // Date
        data.personName || '', // Person Name
        data.remittancePlatform || '', // Remittance Platform
        data.remittedBankPlatform || '', // Bank/Platform
        data.volume || 0, // Remitting Volume (INR)
        data.euroRate || 0, // EUR Rate
        data.remittanceFees || 0, // Remittance Fees (INR)
        data.totalReceivedEuro || 0, // Received EUR
        data.usdcBuyingPlatform || '', // USDC Buying Platform
        formatDate(data.usdcBuyingDate), // USDC Buying Date
        formatPurchases(data.usdcPurchases), // USDC Purchases
        data.usdtSellingAccountName || '', // USDT Selling Account Name
        formatDate(data.usdtSellingDate), // USDT Selling Date
        formatSales(data.usdtSales), // USDT Sales
        data.totalAmountInr || 0, // Total USDT Sold (INR)
        data.profitBeforeTax || 0, // Gross Profit
        data.estoniaTax || 0, // Estonia Tax
        data.indiaTax || 0, // India Tax
        data.netProfit || 0, // Net Profit
        data.notes || '' // Notes
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "'Arbitrage Transactions'!A:T", // Append to the correct sheet
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    console.log("Successfully appended to Google Sheet");
  } catch (error) {
    console.error("Error appending to Google Sheet:", error.message || error);
  }
}

require("dotenv").config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer Storage
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|png|jpg|jpeg|gif|txt/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/nexus_platform")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ==================== SCHEMAS ====================

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  notifications: [{
    id: { type: String },
    message: { type: String },
    type: { type: String, default: "info" },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    resourceType: { type: String },
    resourceId: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }],
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model("User", userSchema);

// Document Schema with visibility
const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  tags: [{ type: String }],
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  visibleToAll: { type: Boolean, default: true },
  visibleToUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Document = mongoose.model("Document", documentSchema);

// Transaction Schema with visibility
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["deposit", "withdrawal"], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  description: { type: String, default: "" },
  reference: { type: String },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  attachmentUrl: { type: String },
  attachmentName: { type: String },
  visibleToAll: { type: Boolean, default: true },
  visibleToUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

// Balance Schema
const balanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: "INR" },
  updatedAt: { type: Date, default: Date.now },
});

const Balance = mongoose.model("Balance", balanceSchema);

// Arbitro Schema with visibility
const arbitroSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, default: Date.now },
  remittancePlatform: { type: String, default: "" },
  remitPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "RemitPerson", default: null },
  personName: { type: String, default: "" },
  remittedBankPlatform: { type: String, default: "" },
  volume: { type: Number, required: true },
  euroRate: { type: Number, required: true },
  remittanceFees: { type: Number, default: 0 },
  totalEuroBeforeFees: { type: Number },
  remittanceFeesEuro: { type: Number },
  totalReceivedEuro: { type: Number },
  usdtPurchaseRateEuro: { type: Number, required: true },
  usdtReceived: { type: Number },
  usdtSellingRateInr: { type: Number, required: true },
  usdcBuyingPlatform: { type: String, default: "" },
  bankUsedForBuying: { type: String, default: "" },
  usdcBuyingDate: { type: Date },
  usdcPurchases: [{
    rateEuro: { type: Number, required: true },
    sellerName: { type: String, required: true },
    volumeEuro: { type: Number, required: true },
    usdcAmount: { type: Number, default: 0 },
  }],
  usdtSellingAccountName: { type: String, default: "" },
  usdtSellingDate: { type: Date },
  usdtSales: [{
    rateInr: { type: Number, required: true },
    buyerName: { type: String, required: true },
    volumeInr: { type: Number, required: true },
    usdtAmount: { type: Number, default: 0 },
  }],
  totalAmountInr: { type: Number },
  profitBeforeTax: { type: Number },
  estoniaTax: { type: Number },
  indiaTax: { type: Number },
  netProfit: { type: Number },
  notes: { type: String, default: "" },
  visibleToAll: { type: Boolean, default: true },
  visibleToUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

const Arbitro = mongoose.model("Arbitro", arbitroSchema);

const arbitroDraftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  visibleToAll: { type: Boolean, default: true },
  visibleToUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const ArbitroDraft = mongoose.model("ArbitroDraft", arbitroDraftSchema);

const REMITTANCE_PLATFORMS = ["Western Union", "DBS", "IndusInd", "Niyo Global"];
const remittanceLimit = (platform) => platform === "Western Union" ? 800000 : 1000000;
const fiscalYearRange = (value = new Date()) => {
  const date = new Date(value);
  const year = date.getUTCMonth() >= 3 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return {
    start: new Date(Date.UTC(year, 3, 1)),
    end: new Date(Date.UTC(year + 1, 3, 1)),
    label: `${year}-${String(year + 1).slice(-2)}`,
  };
};

const remitPersonSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true },
  nameKey: { type: String, required: true },
  platforms: [{ type: String, enum: REMITTANCE_PLATFORMS }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
remitPersonSchema.index({ userId: 1, nameKey: 1 }, { unique: true });
const RemitPerson = mongoose.model("RemitPerson", remitPersonSchema);

// Email Transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Nexus Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("Email error:", err);
    return false;
  }
};

// JWT Helper
const JWT_SECRET = process.env.JWT_SECRET || "nexus_super_secret_key_2024";
const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "Not authenticated" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password -otp -otpExpiry");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Helper to get visible items for a user
const getVisibleQuery = (userId, includeOwn = true) => {
  if (includeOwn) {
    return {
      $or: [
        { userId: userId },
        { visibleToAll: true },
        { visibleToUsers: userId }
      ]
    };
  } else {
    return {
      $or: [
        { visibleToAll: true },
        { visibleToUsers: userId }
      ]
    };
  }
};

// Add Notification with resource info
const addNotification = async (userId, message, type = "info", resourceType = null, resourceId = null, targetUserId = null) => {
  const notificationData = {
    id: crypto.randomUUID(),
    message,
    type,
    read: false,
    createdAt: new Date(),
  };
  if (resourceType) notificationData.resourceType = resourceType;
  if (resourceId) notificationData.resourceId = resourceId;
  
  await User.findByIdAndUpdate(userId, {
    $push: { notifications: { $each: [notificationData], $slice: -50 } }
  });
  
  // If target user is different, also notify them
  if (targetUserId && targetUserId.toString() !== userId.toString()) {
    await User.findByIdAndUpdate(targetUserId, {
      $push: { notifications: { $each: [{ ...notificationData, userId: userId }], $slice: -50 } }
    });
  }
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ==================== AUTH ROUTES ====================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields required" });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ success: false, message: "Email already registered" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = new User({ name, email, password, otp, otpExpiry });
    await user.save();
    await Balance.create({ userId: user._id, balance: 0 });

    await sendEmail(email, "Verify your Nexus account", `<div><h2>Verify your email</h2><p>Your OTP: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p></div>`);

    res.status(201).json({ success: true, message: "Registration successful. OTP sent.", userId: user._id });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.isVerified) return res.status(400).json({ success: false, message: "Already verified" });
    if (user.otp !== otp || new Date() > user.otpExpiry)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = signToken(user._id);
    res.json({ success: true, message: "Email verified", token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!user.isVerified)
      return res.status(403).json({ success: false, message: "Email not verified", userId: user._id });

    const token = signToken(user._id);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  res.json({ success: true, user: req.user });
});

app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("_id name email");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== NOTIFICATIONS ====================

app.get("/api/notifications", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).select("notifications");
  res.json({ success: true, notifications: (user.notifications || []).reverse() });
});

app.patch("/api/notifications/read-all", authMiddleware, async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { "notifications.$[].read": true } });
  res.json({ success: true });
});

// ==================== DOCUMENT ROUTES ====================

app.get("/api/documents", authMiddleware, async (req, res) => {
  try {
    const { name, tag, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = getVisibleQuery(req.user._id);
    
    if (name) query.name = { $regex: name, $options: "i" };
    if (tag) query.tags = { $in: [tag] };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const total = await Document.countDocuments(query);
    const docs = await Document.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, documents: docs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/documents", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { name, description, tags, visibleToAll, visibleToUsers } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Document name required" });

    const parsedTags = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [];
    const parsedVisibleUsers = visibleToUsers ? (Array.isArray(visibleToUsers) ? visibleToUsers : JSON.parse(visibleToUsers)) : [];

    const docData = {
      userId: req.user._id,
      name,
      description: description || "",
      tags: parsedTags,
      visibleToAll: visibleToAll === true || visibleToAll === "true",
      visibleToUsers: parsedVisibleUsers,
    };

    if (req.file) {
      docData.fileUrl = `/uploads/${req.file.filename}`;
      docData.fileName = req.file.originalname;
      docData.fileSize = req.file.size;
      docData.mimeType = req.file.mimetype;
    }

    const doc = await Document.create(docData);
    
    // Notify visible users
    if (doc.visibleToAll) {
      const users = await User.find({ _id: { $ne: req.user._id } }).select("_id");
      for (const user of users) {
        await addNotification(user._id, `${req.user.name} shared a document: "${name}"`, "info", "document", doc._id, user._id);
      }
    } else if (doc.visibleToUsers.length > 0) {
      for (const userId of doc.visibleToUsers) {
        await addNotification(userId, `${req.user.name} shared a document: "${name}" with you`, "info", "document", doc._id, userId);
      }
    }
    
    await addNotification(req.user._id, `Document "${name}" uploaded successfully`, "success", "document", doc._id);
    res.status(201).json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.put("/api/documents/:id", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    const { name, description, tags, visibleToAll, visibleToUsers } = req.body;
    if (name) doc.name = name;
    if (description !== undefined) doc.description = description;
    if (tags) doc.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
    if (visibleToAll !== undefined) doc.visibleToAll = visibleToAll === true || visibleToAll === "true";
    if (visibleToUsers) doc.visibleToUsers = Array.isArray(visibleToUsers) ? visibleToUsers : JSON.parse(visibleToUsers);
    if (req.file) {
      doc.fileUrl = `/uploads/${req.file.filename}`;
      doc.fileName = req.file.originalname;
      doc.fileSize = req.file.size;
      doc.mimeType = req.file.mimetype;
    }
    doc.updatedAt = new Date();
    await doc.save();
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.delete("/api/documents/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/documents/tags", authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find(getVisibleQuery(req.user._id)).select("tags");
    const allTags = [...new Set(docs.flatMap((d) => d.tags))];
    res.json({ success: true, tags: allTags });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== FINANCE ROUTES ====================

app.get("/api/finance/balance", authMiddleware, async (req, res) => {
  try {
    let bal = await Balance.findOne({ userId: req.user._id });
    if (!bal) bal = await Balance.create({ userId: req.user._id, balance: 0 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayStats, monthStats] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: req.user._id, createdAt: { $gte: today }, status: "completed" } },
        { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { userId: req.user._id, createdAt: { $gte: monthStart }, status: "completed" } },
        { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
    ]);

    const parseStats = (stats) => {
      const result = { deposit: { total: 0, count: 0 }, withdrawal: { total: 0, count: 0 } };
      stats.forEach((s) => (result[s._id] = { total: s.total, count: s.count }));
      return result;
    };

    res.json({ success: true, balance: bal.balance, currency: bal.currency, today: parseStats(todayStats), month: parseStats(monthStats) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/finance/transactions", authMiddleware, async (req, res) => {
  try {
    const { type, page = 1, limit = 20, startDate, endDate } = req.query;
    const query = getVisibleQuery(req.user._id);

    if (type && ["deposit", "withdrawal"].includes(type)) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, transactions, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/finance/deposit", authMiddleware, upload.single("attachment"), async (req, res) => {
  try {
    const { amount, description, reference, currency, visibleToAll, visibleToUsers } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: "Valid amount required" });

    const parsedVisibleUsers = visibleToUsers ? (Array.isArray(visibleToUsers) ? visibleToUsers : JSON.parse(visibleToUsers)) : [];

    const txData = {
      userId: req.user._id,
      type: "deposit",
      amount: Number(amount),
      currency: currency || "INR",
      description: description || "",
      reference: reference || "",
      status: "completed",
      visibleToAll: visibleToAll === true || visibleToAll === "true",
      visibleToUsers: parsedVisibleUsers,
    };

    if (req.file) {
      txData.attachmentUrl = `/uploads/${req.file.filename}`;
      txData.attachmentName = req.file.originalname;
    }

    const tx = await Transaction.create(txData);
    await Balance.findOneAndUpdate({ userId: req.user._id }, { $inc: { balance: Number(amount) }, updatedAt: new Date() }, { upsert: true });

    // Notify visible users
    if (tx.visibleToAll) {
      const users = await User.find({ _id: { $ne: req.user._id } }).select("_id");
      for (const user of users) {
        await addNotification(user._id, `${req.user.name} made a deposit of ₹${Number(amount).toLocaleString()}`, "success", "finance", tx._id, user._id);
      }
    } else if (tx.visibleToUsers.length > 0) {
      for (const userId of tx.visibleToUsers) {
        await addNotification(userId, `${req.user.name} made a deposit of ₹${Number(amount).toLocaleString()}`, "success", "finance", tx._id, userId);
      }
    }

    await addNotification(req.user._id, `Deposit of ₹${Number(amount).toLocaleString()} confirmed`, "success", "finance", tx._id);
    res.status(201).json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/finance/withdrawal", authMiddleware, upload.single("attachment"), async (req, res) => {
  try {
    const { amount, description, reference, currency, visibleToAll, visibleToUsers } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: "Valid amount required" });

    const bal = await Balance.findOne({ userId: req.user._id });
    if (!bal || bal.balance < Number(amount))
      return res.status(400).json({ success: false, message: "Insufficient balance" });

    const parsedVisibleUsers = visibleToUsers ? (Array.isArray(visibleToUsers) ? visibleToUsers : JSON.parse(visibleToUsers)) : [];

    const txData = {
      userId: req.user._id,
      type: "withdrawal",
      amount: Number(amount),
      currency: currency || "INR",
      description: description || "",
      reference: reference || "",
      status: "completed",
      visibleToAll: visibleToAll === true || visibleToAll === "true",
      visibleToUsers: parsedVisibleUsers,
    };

    if (req.file) {
      txData.attachmentUrl = `/uploads/${req.file.filename}`;
      txData.attachmentName = req.file.originalname;
    }

    const tx = await Transaction.create(txData);
    await Balance.findOneAndUpdate({ userId: req.user._id }, { $inc: { balance: -Number(amount) }, updatedAt: new Date() });

    // Notify visible users
    if (tx.visibleToAll) {
      const users = await User.find({ _id: { $ne: req.user._id } }).select("_id");
      for (const user of users) {
        await addNotification(user._id, `${req.user.name} made a withdrawal of ₹${Number(amount).toLocaleString()}`, "warning", "finance", tx._id, user._id);
      }
    } else if (tx.visibleToUsers.length > 0) {
      for (const userId of tx.visibleToUsers) {
        await addNotification(userId, `${req.user.name} made a withdrawal of ₹${Number(amount).toLocaleString()}`, "warning", "finance", tx._id, userId);
      }
    }

    await addNotification(req.user._id, `Withdrawal of ₹${Number(amount).toLocaleString()} processed`, "warning", "finance", tx._id);
    res.status(201).json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== REMIT BALANCE ROUTES ====================

const remitPeopleWithBalances = async (userId, at = new Date()) => {
  const period = fiscalYearRange(at);
  const people = await RemitPerson.find({ userId }).sort({ createdAt: -1 }).lean();
  const personIds = people.map((person) => person._id);
  const usage = personIds.length ? await Arbitro.aggregate([
    { $match: {
      userId: new mongoose.Types.ObjectId(String(userId)),
      remitPersonId: { $in: personIds },
      date: { $gte: period.start, $lt: period.end },
    } },
    { $group: { _id: { personId: "$remitPersonId", platform: "$remittancePlatform" }, used: { $sum: "$volume" }, transactions: { $sum: 1 } } },
  ]) : [];
  const usageMap = new Map(usage.map((item) => [`${item._id.personId}:${item._id.platform}`, item]));

  return {
    period,
    people: people.map((person) => ({
      ...person,
      platformBalances: person.platforms.map((platform) => {
        const item = usageMap.get(`${person._id}:${platform}`);
        const limit = remittanceLimit(platform);
        const used = Number(item?.used || 0);
        return { platform, limit, used, remaining: Math.max(0, limit - used), transactions: item?.transactions || 0 };
      }),
    })),
  };
};

app.get("/api/remit-balance", authMiddleware, async (req, res) => {
  try {
    const { people, period } = await remitPeopleWithBalances(req.user._id);
    const totals = people.flatMap((person) => person.platformBalances).reduce((sum, item) => ({
      limit: sum.limit + item.limit,
      used: sum.used + item.used,
      remaining: sum.remaining + item.remaining,
      platforms: sum.platforms + 1,
    }), { limit: 0, used: 0, remaining: 0, platforms: 0 });
    res.json({ success: true, people, stats: { ...totals, people: people.length }, fiscalYear: period.label, resetsAt: period.end });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/remit-balance", authMiddleware, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];
    const platformCount = Number(req.body.platformCount);
    const uniquePlatforms = [...new Set(platforms)];
    if (!name) return res.status(400).json({ success: false, message: "Person name is required" });
    if (!Number.isInteger(platformCount) || platformCount < 1 || platformCount > 6 || uniquePlatforms.length !== platformCount)
      return res.status(400).json({ success: false, message: "Select the requested number of unique platforms (maximum 6)" });
    if (uniquePlatforms.some((platform) => !REMITTANCE_PLATFORMS.includes(platform)))
      return res.status(400).json({ success: false, message: "Invalid remittance platform" });

    const person = await RemitPerson.create({
      userId: req.user._id,
      name,
      nameKey: name.toLocaleLowerCase(),
      platforms: uniquePlatforms,
    });
    res.status(201).json({ success: true, person });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ success: false, message: "A person with this name already exists" });
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.put("/api/remit-balance/:id", authMiddleware, async (req, res) => {
  try {
    const person = await RemitPerson.findOne({ _id: req.params.id, userId: req.user._id });
    if (!person) return res.status(404).json({ success: false, message: "Person not found" });

    const name = String(req.body.name || "").trim();
    const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];
    const platformCount = Number(req.body.platformCount);
    const uniquePlatforms = [...new Set(platforms)];
    if (!name) return res.status(400).json({ success: false, message: "Person name is required" });
    if (!Number.isInteger(platformCount) || platformCount < 1 || platformCount > 6 || uniquePlatforms.length !== platformCount)
      return res.status(400).json({ success: false, message: "Select the requested number of unique platforms (maximum 6)" });
    if (uniquePlatforms.some((platform) => !REMITTANCE_PLATFORMS.includes(platform)))
      return res.status(400).json({ success: false, message: "Invalid remittance platform" });

    const removedPlatforms = person.platforms.filter((platform) => !uniquePlatforms.includes(platform));
    if (removedPlatforms.length) {
      const linked = await Arbitro.exists({ userId: req.user._id, remitPersonId: person._id, remittancePlatform: { $in: removedPlatforms } });
      if (linked) return res.status(409).json({ success: false, message: "A platform with linked Arbitro transactions cannot be removed" });
    }

    person.name = name;
    person.nameKey = name.toLocaleLowerCase();
    person.platforms = uniquePlatforms;
    person.updatedAt = new Date();
    await person.save();
    await Arbitro.updateMany({ userId: req.user._id, remitPersonId: person._id }, { $set: { personName: name } });
    res.json({ success: true, person });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ success: false, message: "A person with this name already exists" });
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.delete("/api/remit-balance/:id", authMiddleware, async (req, res) => {
  try {
    const linked = await Arbitro.exists({ userId: req.user._id, remitPersonId: req.params.id });
    if (linked) return res.status(409).json({ success: false, message: "This person has linked Arbitro transactions and cannot be deleted" });
    const person = await RemitPerson.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!person) return res.status(404).json({ success: false, message: "Person not found" });
    res.json({ success: true, message: "Person deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== ARBITRO ROUTES ====================

app.get("/api/arbitro/drafts", authMiddleware, async (req, res) => {
  try {
    const drafts = await ArbitroDraft.find(getVisibleQuery(req.user._id))
      .populate("userId", "name email")
      .populate("updatedBy", "name email")
      .sort({ updatedAt: -1 });
    const editableDrafts = drafts.map((draft) => {
      const value = draft.toObject();
      value.canEdit = String(draft.userId?._id || draft.userId) === String(req.user._id) || draft.visibleToAll;
      return value;
    });
    res.json({ success: true, drafts: editableDrafts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/arbitro/drafts", authMiddleware, async (req, res) => {
  try {
    const { data = {}, visibleToAll, visibleToUsers } = req.body;
    const parsedVisibleUsers = Array.isArray(visibleToUsers) ? visibleToUsers : [];
    const draft = await ArbitroDraft.create({
      userId: req.user._id,
      updatedBy: req.user._id,
      data,
      visibleToAll: visibleToAll === true || visibleToAll === "true",
      visibleToUsers: parsedVisibleUsers,
    });
    res.status(201).json({ success: true, draft });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.put("/api/arbitro/drafts/:id", authMiddleware, async (req, res) => {
  try {
    const draft = await ArbitroDraft.findById(req.params.id);
    if (!draft) return res.status(404).json({ success: false, message: "Draft not found" });
    const owner = String(draft.userId) === String(req.user._id);
    if (!owner && !draft.visibleToAll) return res.status(403).json({ success: false, message: "You cannot edit this draft" });
    draft.data = req.body.data || {};
    draft.updatedBy = req.user._id;
    draft.updatedAt = new Date();
    if (owner) {
      draft.visibleToAll = req.body.visibleToAll === true || req.body.visibleToAll === "true";
      draft.visibleToUsers = Array.isArray(req.body.visibleToUsers) ? req.body.visibleToUsers : [];
    }
    await draft.save();
    res.json({ success: true, draft });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.delete("/api/arbitro/drafts/:id", authMiddleware, async (req, res) => {
  try {
    const draft = await ArbitroDraft.findById(req.params.id);
    if (!draft) return res.status(404).json({ success: false, message: "Draft not found" });
    const owner = String(draft.userId) === String(req.user._id);
    if (!owner && !draft.visibleToAll) return res.status(403).json({ success: false, message: "You cannot delete this draft" });
    await draft.deleteOne();
    res.json({ success: true, message: "Draft deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/arbitro", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const query = getVisibleQuery(req.user._id);

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const total = await Arbitro.countDocuments(query);
    const records = await Arbitro.find(query)
      .populate("userId", "name email")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const editableRecords = records.map((record) => {
      const value = record.toObject();
      value.canEdit = String(record.userId?._id || record.userId) === String(req.user._id) || record.visibleToAll;
      value.canDelete = String(record.userId?._id || record.userId) === String(req.user._id);
      return value;
    });
    res.json({ success: true, records: editableRecords, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/arbitro", authMiddleware, async (req, res) => {
  try {
    const {
      volume, euroRate, remittanceFees, date, notes, visibleToAll, visibleToUsers,
      remittancePlatform, remitPersonId, remittedBankPlatform, usdcBuyingPlatform,
      usdcBuyingDate, usdcPurchases, usdtSellingAccountName, usdtSellingDate, usdtSales
    } = req.body;

    if (!volume || !euroRate || !remittancePlatform || !remitPersonId || !remittedBankPlatform ||
        !usdcBuyingPlatform || !Array.isArray(usdcPurchases) || !usdcPurchases.length ||
        !usdtSellingAccountName || !Array.isArray(usdtSales) || !usdtSales.length)
      return res.status(400).json({ success: false, message: "Required fields missing" });

    const vol = Number(volume);
    const eurRate = Number(euroRate);
    const remFeesInr = Number(remittanceFees) || 0;
    if (!Number.isFinite(vol) || vol <= 0 || !Number.isFinite(eurRate) || eurRate <= 0)
      return res.status(400).json({ success: false, message: "Volume and EUR rate must be positive numbers" });

    let sourceDraft = null;
    let recordOwnerId = req.user._id;
    if (req.body.sourceDraftId) {
      sourceDraft = await ArbitroDraft.findById(req.body.sourceDraftId);
      if (!sourceDraft || (String(sourceDraft.userId) !== String(req.user._id) && !sourceDraft.visibleToAll))
        return res.status(403).json({ success: false, message: "You cannot publish this draft" });
      recordOwnerId = sourceDraft.userId;
    }

    const remitPerson = await RemitPerson.findOne({ _id: remitPersonId, userId: recordOwnerId });
    if (!remitPerson) return res.status(400).json({ success: false, message: "Select a valid RemitBalance person" });
    if (!remitPerson.platforms.includes(remittancePlatform))
      return res.status(400).json({ success: false, message: `${remitPerson.name} does not have ${remittancePlatform} enabled` });

    const transactionDate = date ? new Date(date) : new Date();
    if (Number.isNaN(transactionDate.getTime())) return res.status(400).json({ success: false, message: "Invalid remitting date" });
    const fiscalPeriod = fiscalYearRange(transactionDate);
    const usedRows = await Arbitro.aggregate([
      { $match: {
        userId: new mongoose.Types.ObjectId(String(recordOwnerId)),
        remitPersonId: remitPerson._id,
        remittancePlatform,
        date: { $gte: fiscalPeriod.start, $lt: fiscalPeriod.end },
      } },
      { $group: { _id: null, used: { $sum: "$volume" } } },
    ]);
    const used = Number(usedRows[0]?.used || 0);
    const platformLimit = remittanceLimit(remittancePlatform);
    if (used + vol > platformLimit) {
      const remaining = Math.max(0, platformLimit - used);
      return res.status(409).json({ success: false, message: `Only ₹${remaining.toLocaleString("en-IN")} remains for ${remitPerson.name} on ${remittancePlatform} in FY ${fiscalPeriod.label}` });
    }
    const purchases = usdcPurchases.map((row) => ({
      rateEuro: Number(row.rateEuro), sellerName: String(row.sellerName || "").trim(),
      volumeEuro: Number(row.volumeEuro), usdcAmount: Number(row.volumeEuro) / Number(row.rateEuro),
    }));
    const sales = usdtSales.map((row) => {
      const rateInr = Number(row.rateInr);
      // Keep old clients compatible while making USDT amount the source of truth.
      const usdtAmount = Number(row.usdtAmount) || (Number(row.volumeInr) / rateInr);
      return {
        rateInr, buyerName: String(row.buyerName || "").trim(), usdtAmount,
        volumeInr: +(usdtAmount * rateInr).toFixed(2),
      };
    });

    if (purchases.some((row) => !row.rateEuro || !row.sellerName || !row.volumeEuro) ||
        sales.some((row) => !row.rateInr || !row.buyerName || !row.usdtAmount || !row.volumeInr))
      return res.status(400).json({ success: false, message: "Complete every purchase and sale row" });

    const totalEuro = vol / eurRate;
    const remFeesEuro = remFeesInr / eurRate;
    const euroAfterFees = totalEuro - remFeesEuro;
    const usdtReceived = purchases.reduce((sum, row) => sum + row.usdcAmount, 0);
    const totalAmountInr = sales.reduce((sum, row) => sum + row.volumeInr, 0);
    const profitBeforeTax = totalAmountInr - vol;
    const estoniaTax = profitBeforeTax > 0 ? profitBeforeTax * 0.20 : 0;
    const indiaTax = profitBeforeTax > 0 ? profitBeforeTax * 0.30 : 0;
    const netProfit = profitBeforeTax > 0 ? profitBeforeTax - (estoniaTax + indiaTax) : profitBeforeTax;

    const draftOwner = !sourceDraft || String(sourceDraft.userId) === String(req.user._id);
    const parsedVisibleUsers = draftOwner
      ? (visibleToUsers ? (Array.isArray(visibleToUsers) ? visibleToUsers : JSON.parse(visibleToUsers)) : [])
      : sourceDraft.visibleToUsers;
    const effectiveVisibleToAll = draftOwner ? (visibleToAll === true || visibleToAll === "true") : sourceDraft.visibleToAll;

    const record = await Arbitro.create({
      userId: recordOwnerId,
      date: transactionDate,
      remittancePlatform,
      remitPersonId: remitPerson._id,
      personName: remitPerson.name,
      remittedBankPlatform: String(remittedBankPlatform).trim(),
      volume: vol,
      euroRate: eurRate,
      remittanceFees: remFeesInr,
      totalEuroBeforeFees: +totalEuro.toFixed(4),
      remittanceFeesEuro: +remFeesEuro.toFixed(4),
      totalReceivedEuro: +euroAfterFees.toFixed(4),
      usdtPurchaseRateEuro: purchases[0].rateEuro,
      usdtReceived: +usdtReceived.toFixed(4),
      usdtSellingRateInr: sales[0].rateInr,
      usdcBuyingPlatform,
      bankUsedForBuying: String(remittedBankPlatform).trim(),
      usdcBuyingDate: usdcBuyingDate ? new Date(usdcBuyingDate) : new Date(),
      usdcPurchases: purchases,
      usdtSellingAccountName: String(usdtSellingAccountName).trim(),
      usdtSellingDate: usdtSellingDate ? new Date(usdtSellingDate) : new Date(),
      usdtSales: sales,
      totalAmountInr: +totalAmountInr.toFixed(2),
      profitBeforeTax: +profitBeforeTax.toFixed(2),
      estoniaTax: +estoniaTax.toFixed(2),
      indiaTax: +indiaTax.toFixed(2),
      netProfit: +netProfit.toFixed(2),
      notes: notes || "",
      visibleToAll: effectiveVisibleToAll,
      visibleToUsers: parsedVisibleUsers,
    });

    // Notify visible users
    if (record.visibleToAll) {
      const users = await User.find({ _id: { $ne: req.user._id } }).select("_id");
      for (const user of users) {
        await addNotification(user._id, `${req.user.name} added an arbitro entry with profit ₹${netProfit.toFixed(2)}`, "info", "arbitro", record._id, user._id);
      }
    } else if (record.visibleToUsers.length > 0) {
      for (const userId of record.visibleToUsers) {
        await addNotification(userId, `${req.user.name} shared an arbitro entry with you`, "info", "arbitro", record._id, userId);
      }
    }

    await addNotification(req.user._id, `Arbitro entry logged — Net Profit: ₹${netProfit.toFixed(2)}`, "info", "arbitro", record._id);
    
    // Append to Google Sheet asynchronously
    appendToGoogleSheet(record);

    if (sourceDraft) await sourceDraft.deleteOne();

    res.status(201).json({ success: true, record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.put("/api/arbitro/:id", authMiddleware, async (req, res) => {
  try {
    const record = await Arbitro.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    const owner = String(record.userId) === String(req.user._id);
    if (!owner && !record.visibleToAll) return res.status(403).json({ success: false, message: "You cannot edit this record" });

    const {
      volume, euroRate, remittanceFees, date, notes, visibleToAll, visibleToUsers,
      remittancePlatform, remitPersonId, remittedBankPlatform, usdcBuyingPlatform,
      usdcBuyingDate, usdcPurchases, usdtSellingAccountName, usdtSellingDate, usdtSales
    } = req.body;
    if (!volume || !euroRate || !remittancePlatform || !remitPersonId || !remittedBankPlatform ||
        !usdcBuyingPlatform || !Array.isArray(usdcPurchases) || !usdcPurchases.length ||
        !usdtSellingAccountName || !Array.isArray(usdtSales) || !usdtSales.length)
      return res.status(400).json({ success: false, message: "Required fields missing" });

    const vol = Number(volume), eurRate = Number(euroRate), remFeesInr = Number(remittanceFees) || 0;
    if (!Number.isFinite(vol) || vol <= 0 || !Number.isFinite(eurRate) || eurRate <= 0)
      return res.status(400).json({ success: false, message: "Volume and EUR rate must be positive numbers" });

    const recordOwnerId = record.userId;
    const remitPerson = await RemitPerson.findOne({ _id: remitPersonId, userId: recordOwnerId });
    if (!remitPerson) return res.status(400).json({ success: false, message: "Select a valid RemitBalance person" });
    if (!remitPerson.platforms.includes(remittancePlatform))
      return res.status(400).json({ success: false, message: `${remitPerson.name} does not have ${remittancePlatform} enabled` });

    const transactionDate = date ? new Date(date) : new Date();
    if (Number.isNaN(transactionDate.getTime())) return res.status(400).json({ success: false, message: "Invalid remitting date" });
    const fiscalPeriod = fiscalYearRange(transactionDate);
    const usedRows = await Arbitro.aggregate([
      { $match: {
        _id: { $ne: record._id },
        userId: new mongoose.Types.ObjectId(String(recordOwnerId)),
        remitPersonId: remitPerson._id,
        remittancePlatform,
        date: { $gte: fiscalPeriod.start, $lt: fiscalPeriod.end },
      } },
      { $group: { _id: null, used: { $sum: "$volume" } } },
    ]);
    const used = Number(usedRows[0]?.used || 0), platformLimit = remittanceLimit(remittancePlatform);
    if (used + vol > platformLimit) {
      const remaining = Math.max(0, platformLimit - used);
      return res.status(409).json({ success: false, message: `Only ₹${remaining.toLocaleString("en-IN")} remains for ${remitPerson.name} on ${remittancePlatform} in FY ${fiscalPeriod.label}` });
    }

    const purchases = usdcPurchases.map((row) => ({
      rateEuro: Number(row.rateEuro), sellerName: String(row.sellerName || "").trim(),
      volumeEuro: Number(row.volumeEuro), usdcAmount: Number(row.volumeEuro) / Number(row.rateEuro),
    }));
    const sales = usdtSales.map((row) => {
      const rateInr = Number(row.rateInr);
      const usdtAmount = Number(row.usdtAmount) || (Number(row.volumeInr) / rateInr);
      return { rateInr, buyerName: String(row.buyerName || "").trim(), usdtAmount, volumeInr: +(usdtAmount * rateInr).toFixed(2) };
    });
    if (purchases.some((row) => !row.rateEuro || !row.sellerName || !row.volumeEuro) ||
        sales.some((row) => !row.rateInr || !row.buyerName || !row.usdtAmount || !row.volumeInr))
      return res.status(400).json({ success: false, message: "Complete every purchase and sale row" });

    const totalEuro = vol / eurRate, remFeesEuro = remFeesInr / eurRate, euroAfterFees = totalEuro - remFeesEuro;
    const usdtReceived = purchases.reduce((sum, row) => sum + row.usdcAmount, 0);
    const totalAmountInr = sales.reduce((sum, row) => sum + row.volumeInr, 0);
    const profitBeforeTax = totalAmountInr - vol;
    const estoniaTax = profitBeforeTax > 0 ? profitBeforeTax * .2 : 0, indiaTax = profitBeforeTax > 0 ? profitBeforeTax * .3 : 0;
    const netProfit = profitBeforeTax > 0 ? profitBeforeTax - estoniaTax - indiaTax : profitBeforeTax;
    const parsedVisibleUsers = Array.isArray(visibleToUsers) ? visibleToUsers : [];

    Object.assign(record, {
      date: transactionDate, remittancePlatform, remitPersonId: remitPerson._id, personName: remitPerson.name,
      remittedBankPlatform: String(remittedBankPlatform).trim(), volume: vol, euroRate: eurRate,
      remittanceFees: remFeesInr, totalEuroBeforeFees: +totalEuro.toFixed(4), remittanceFeesEuro: +remFeesEuro.toFixed(4),
      totalReceivedEuro: +euroAfterFees.toFixed(4), usdtPurchaseRateEuro: purchases[0].rateEuro,
      usdtReceived: +usdtReceived.toFixed(4), usdtSellingRateInr: sales[0].rateInr, usdcBuyingPlatform,
      bankUsedForBuying: String(remittedBankPlatform).trim(), usdcBuyingDate: usdcBuyingDate ? new Date(usdcBuyingDate) : new Date(),
      usdcPurchases: purchases, usdtSellingAccountName: String(usdtSellingAccountName).trim(),
      usdtSellingDate: usdtSellingDate ? new Date(usdtSellingDate) : new Date(), usdtSales: sales,
      totalAmountInr: +totalAmountInr.toFixed(2), profitBeforeTax: +profitBeforeTax.toFixed(2),
      estoniaTax: +estoniaTax.toFixed(2), indiaTax: +indiaTax.toFixed(2), netProfit: +netProfit.toFixed(2), notes: notes || "",
    });
    if (owner) {
      record.visibleToAll = visibleToAll === true || visibleToAll === "true";
      record.visibleToUsers = parsedVisibleUsers;
    }
    await record.save();
    await addNotification(record.userId, `${req.user.name} updated an Arbitro transaction`, "info", "arbitro", record._id);
    res.json({ success: true, record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.delete("/api/arbitro/:id", authMiddleware, async (req, res) => {
  try {
    const record = await Arbitro.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== DASHBOARD STATS ====================

app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [docCount, bal, txCount, arbitroCount, recentTx, recentArbitro, allUsersTx, allUsersArbitro] = await Promise.all([
      Document.countDocuments(getVisibleQuery(userId)),
      Balance.findOne({ userId }),
      Transaction.countDocuments(getVisibleQuery(userId)),
      Arbitro.countDocuments(getVisibleQuery(userId)),
      Transaction.find(getVisibleQuery(userId)).sort({ createdAt: -1 }).limit(5).populate("userId", "name email"),
      Arbitro.find(getVisibleQuery(userId)).sort({ date: -1 }).limit(5).populate("userId", "name email"),
      Transaction.aggregate([
        { $match: getVisibleQuery(userId, false) },
        { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Arbitro.aggregate([
        { $match: getVisibleQuery(userId, false) },
        { $group: { _id: null, totalProfit: { $sum: "$netProfit" }, count: { $sum: 1 } } }
      ])
    ]);

    const monthlyArbitro = await Arbitro.aggregate([
      { $match: { ...getVisibleQuery(userId), date: { $gte: monthStart } } },
      { $group: { _id: null, totalProfit: { $sum: "$netProfit" }, count: { $sum: 1 } } }
    ]);

    const parseTxStats = (stats) => {
      const result = { totalDeposits: 0, totalWithdrawals: 0 };
      stats.forEach(s => {
        if (s._id === "deposit") result.totalDeposits = s.total;
        if (s._id === "withdrawal") result.totalWithdrawals = s.total;
      });
      return result;
    };

    res.json({
      success: true,
      stats: {
        documents: docCount,
        balance: bal?.balance || 0,
        transactions: txCount,
        arbitroEntries: arbitroCount,
        monthlyArbitroProfit: monthlyArbitro[0]?.totalProfit || 0,
        sharedDeposits: parseTxStats(allUsersTx).totalDeposits,
        sharedWithdrawals: parseTxStats(allUsersTx).totalWithdrawals,
        sharedArbitroProfit: allUsersArbitro[0]?.totalProfit || 0,
      },
      recentTransactions: recentTx,
      recentArbitro,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});

app.get("/api/health", (req, res) => res.json({ success: true, message: "Nexus API is running 🚀" }));

app.listen(PORT, () => console.log(`🚀 Nexus server running on port ${PORT}`));

module.exports = app;
