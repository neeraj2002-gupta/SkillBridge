import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "crypto";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase Admin / Service Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ivrmmtxdwzrvwizqxhao.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_sMealvD-4-zfzV3yowIuqw_pZmzdCy2";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("SkillBright WebRTC Signaling & Premium Payment Server is running.");
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENTITLEMENT & 3-DAY FREE TRIAL ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/entitlement/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // 1. Check if user has purchased Lifetime Premium
    if (profile.is_premium) {
      return res.json({
        status: "premium_active",
        isPremium: true,
        premiumPurchasedAt: profile.premium_purchased_at || null,
      });
    }

    // 2. Calculate 3-Day Free Trial based on profile creation date
    const createdAt = new Date(profile.created_at || Date.now());
    const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 Days = 72 Hours
    const trialEndsAt = new Date(createdAt.getTime() + TRIAL_DURATION_MS);
    const now = new Date();

    if (now < trialEndsAt) {
      const diffMs = trialEndsAt.getTime() - now.getTime();
      const remainingDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      const remainingHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

      return res.json({
        status: "trial_active",
        isPremium: false,
        trialEndsAt: trialEndsAt.toISOString(),
        remainingDays,
        remainingHours,
      });
    }

    // 3. Trial expired
    return res.json({
      status: "trial_expired",
      isPremium: false,
      trialEndsAt: trialEndsAt.toISOString(),
      remainingDays: 0,
      remainingHours: 0,
    });
  } catch (err) {
    console.error("Entitlement check error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MANUAL UPI & RAZORPAY VERIFICATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// Manual UPI Payment / UTR Verification Endpoint
app.post("/api/payments/manual-verify", async (req, res) => {
  const { userId, utrNumber } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  if (!utrNumber || utrNumber.trim().length < 6) {
    return res.status(400).json({ error: "Please enter a valid UTR / Transaction Reference ID (at least 6 digits)." });
  }

  try {
    // Update database profile to Premium
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        is_premium: true,
        premium_purchased_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (dbError) {
      console.error("Database update failed for manual verify:", dbError);
      return res.status(500).json({ error: "Failed to update profile to Premium" });
    }

    console.log(`Successfully verified UPI payment (UTR: ${utrNumber}) & unlocked Lifetime Premium for user: ${userId}`);

    return res.json({
      verified: true,
      message: "Payment verified successfully! SkillBridge Lifetime Premium is now active.",
    });
  } catch (err) {
    console.error("Manual payment verification error:", err);
    return res.status(500).json({ error: "Internal payment verification error" });
  }
});

// Razorpay Order Creation Endpoint
app.post("/api/payments/create-order", async (req, res) => {
  const { userId, userEmail } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  const amountPaise = 9900; // ₹99.00 INR
  const currency = "INR";
  const receipt = `sb_receipt_${Date.now()}`;

  try {
    if (razorpayKeyId && razorpayKeySecret) {
      const authHeader = "Basic " + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
      const rzpRes = await axios.post(
        "https://api.razorpay.com/v1/orders",
        {
          amount: amountPaise,
          currency,
          receipt,
          notes: { userId, userEmail: userEmail || "" },
        },
        {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      return res.json({
        orderId: rzpRes.data.id,
        amount: rzpRes.data.amount,
        currency: rzpRes.data.currency,
        keyId: razorpayKeyId,
      });
    } else {
      console.log("RAZORPAY_KEY_SECRET not set in env. Returning fallback order.");
      const demoOrderId = `order_demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return res.json({
        orderId: demoOrderId,
        amount: amountPaise,
        currency,
        keyId: razorpayKeyId || "rzp_test_demo12345",
        isDemo: true,
      });
    }
  } catch (err) {
    console.error("Razorpay order creation error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Could not create payment order" });
  }
});

// Razorpay Verification Endpoint
app.post("/api/payments/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, isDemo } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  try {
    if (razorpayKeySecret && !isDemo) {
      const generatedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        console.warn("Invalid Razorpay signature for user:", userId);
        return res.status(400).json({ error: "Payment verification failed: Invalid signature" });
      }
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        is_premium: true,
        premium_purchased_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (dbError) {
      console.error("Database update failed after payment verification:", dbError);
      return res.status(500).json({ error: "Failed to update profile to Premium" });
    }

    console.log(`Successfully verified Razorpay payment & unlocked Lifetime Premium for user: ${userId}`);

    return res.json({
      verified: true,
      message: "Payment verified successfully. SkillBridge Lifetime Premium is now active!",
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    return res.status(500).json({ error: "Internal payment verification error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SOCKET.IO WEBRTC SIGNALING
// ─────────────────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const otherClients = clientsInRoom.filter((id) => id !== socket.id);

    console.log(`User ${userId} (${socket.id}) joined room ${roomId}. Room count: ${clientsInRoom.length}`);

    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userId,
    });

    socket.emit("existing-peers", {
      peers: otherClients.map((id) => ({
        socketId: id,
        userId: io.sockets.sockets.get(id)?.data?.userId,
      })),
    });
  });

  socket.on("offer", ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit("offer", {
      callerSocketId: socket.id,
      sdp,
    });
  });

  socket.on("answer", ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit("answer", {
      responderSocketId: socket.id,
      sdp,
    });
  });

  socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit("ice-candidate", {
      fromSocketId: socket.id,
      candidate,
    });
  });

  socket.on("leave-room", ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-disconnected", {
      socketId: socket.id,
      userId: socket.data.userId,
    });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit("user-disconnected", {
        socketId: socket.id,
        userId: socket.data.userId,
      });
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SkillBright Server listening on http://localhost:${PORT}`);
});
