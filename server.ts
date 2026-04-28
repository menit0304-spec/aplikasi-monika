import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load config early to set environment variables
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
process.env.GOOGLE_CLOUD_PROJECT = config.projectId;

import { db } from "./firebaseAdmin.js";
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  runTransaction 
} from "firebase/firestore";
import bcrypt from "bcryptjs";
import cookieSession from "cookie-session";
import multer from "multer";
import cors from "cors";

declare global {
  namespace Express {
    interface Request {
      session: {
        userId?: number;
        username?: string;
        isAdmin?: boolean;
      } | any;
    }
  }
}

const __filename = process.env.NODE_ENV === "production" ? "" : fileURLToPath(import.meta.url);
const __dirname = process.env.NODE_ENV === "production" ? process.cwd() : path.dirname(__filename);

// Initialize Firebase
if (!db) {
  console.error("[CRITICAL] Database NOT initialized!");
}
console.log(`[FIREBASE DEBUG] Project ID (config): ${config.projectId}`);
console.log(`[FIREBASE DEBUG] Database ID: ${config.firestoreDatabaseId}`);

// Migrations for existing databases
const migrations: string[] = [];

// Seed Initial Data if empty
// TODO: Implement Firebase seeding

async function startServer() {
  const app = express();
  
  // CRITICAL: Trust proxy BEFORE session middleware
  app.set("trust proxy", true); 
  
  app.use(cors({
    origin: true,
    credentials: true
  }));
  
  app.use(express.json());

  // Verbose logging for session debugging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      const { cookie } = req.headers;
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      console.log(`[DEBUG] ${req.method} ${req.path} | Proto: ${proto} | Sec: ${req.secure} | Cookies: ${cookie ? 'YES' : 'NO'} | Origin: ${req.headers.origin}`);
    }
    next();
  });

  // Static serving for uploads
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // Multer Config
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });
  const upload = multer({ storage });

  app.use(cookieSession({
    name: 'session',
    keys: ['hotel-monika-primary-v1'],
    maxAge: 7 * 24 * 60 * 60 * 1000, 
    secure: true,
    sameSite: "none",
    httpOnly: true
  }));

  // Workaround for Partitioned cookies (CHIPS) if session lib doesn't support it directly
  app.use((req, res, next) => {
    const setCookie = res.append;
    res.append = function(name, val) {
      if (name.toLowerCase() === 'set-cookie') {
        if (Array.isArray(val)) {
          val = val.map(cookie => (cookie.includes('Partitioned') ? cookie : `${cookie}; Partitioned`));
        } else if (typeof val === 'string' && !val.includes('Partitioned')) {
          val = `${val}; Partitioned`;
        }
      }
      return setCookie.call(this, name, val);
    };
    next();
  });

  // Auth Middleware - BYPASSED FOR PUBLIC ACCESS
  const isAuthenticated = (req: any, res: any, next: any) => {
    // Always allow for public access mode
    return next();
  };

  const isAdmin = (req: any, res: any, next: any) => {
    // Always allow for public access mode
    return next();
  };

  // Auth Endpoints - SIMPLIFIED FOR PUBLIC ACCESS
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Username: ${username}`);
    
    // Hardcoded fallback for emergency/initial setup
    if (username === "admin" && password === "admin123") {
      console.log(`[LOGIN] Successful fallback login for admin`);
      req.session = { 
        userId: "admin-fallback", 
        username: "admin", 
        fullName: "Hotel Manager (Fallback)", 
        isAdmin: true 
      };
      return res.json({ 
        id: "admin-fallback", 
        username: "admin", 
        fullName: "Hotel Manager (Fallback)", 
        isAdmin: true,
        authenticated: true 
      });
    }

    try {
      if (!db) {
        console.error("[LOGIN] Database not initialized");
        return res.status(500).json({ error: "Database error" });
      }

      const usersQuery = query(collection(db, "users"), where("username", "==", username));
      const snapshot = await getDocs(usersQuery);
      
      console.log(`[LOGIN] User lookup found ${snapshot.size} matches for ${username}`);

      if (snapshot.empty) {
        console.log(`[LOGIN] No user found with username: ${username}`);
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      
      console.log(`[LOGIN] Checking password for ${username}...`);

      // Compare password
      let passwordMatch = false;
      try {
        passwordMatch = bcrypt.compareSync(password, userData.password);
      } catch (e: any) {
        console.error(`[LOGIN] Bcrypt comparison error: ${e.message}. Testing plain text fallback.`);
        passwordMatch = (password === userData.password);
      }

      if (passwordMatch) {
        console.log(`[LOGIN] Successful login for ${username}`);
        req.session = { 
          userId: userDoc.id, 
          username: userData.username,
          fullName: userData.full_name || userData.fullName,
          isAdmin: !!userData.is_admin
        };
        res.json({ 
          id: userDoc.id, 
          username: userData.username, 
          fullName: userData.full_name || userData.fullName, 
          isAdmin: !!userData.is_admin,
          authenticated: true
        });
      } else {
        console.log(`[LOGIN] Password mismatch for ${username}`);
        res.status(401).json({ error: "Invalid username or password" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session = null;
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session && req.session.userId) {
      res.json({ 
        id: req.session.userId, 
        username: req.session.username,
        fullName: req.session.fullName,
        isAdmin: req.session.isAdmin,
        authenticated: true 
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Ensure default admin exists
  const ensureAdmin = async () => {
    try {
      const q = query(collection(db, "users"), where("username", "==", "admin"));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.log("[LOG] No admin found, creating default admin account...");
        const hashedPassword = bcrypt.hashSync("admin123", 10);
        await addDoc(collection(db, "users"), {
          username: "admin",
          password: hashedPassword,
          full_name: "System Admin",
          role: "admin",
          is_admin: 1
        });
        console.log("[LOG] Default admin created: admin / admin123");
      }
    } catch (e) {
      console.error("[LOG] Failed to check/create default admin:", e);
    }
  };
  ensureAdmin();

  // User Management (Admin Only)
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    const { username, password, fullName, role, isAdmin } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await addDoc(collection(db, "users"), {
        username,
        password: hashedPassword,
        full_name: fullName,
        role,
        is_admin: isAdmin ? 1 : 0
      });
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === req.session.userId) { // Note: this ID logic might be wrong with Firestore IDs
      return res.status(400).json({ error: "Cannot delete yourself" });
    }
    await deleteDoc(doc(db, "users", id));
    res.json({ success: true });
  });

  // API Endpoints
  app.get("/api/rooms", async (req, res) => {
    const { date } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];
    
    console.log(`[GET /api/rooms] Target Date: ${targetDate}`);

    try {
      if (!db) {
        throw new Error("Firestore database not initialized");
      }

      // Fetch all rooms, room types, and guests in parallel
      const [roomsSnapshot, roomTypesSnapshot, guestsSnapshot] = await Promise.all([
        getDocs(collection(db, "rooms")).catch(e => { console.error("Error fetching rooms:", e); throw e; }),
        getDocs(collection(db, "room_types")).catch(e => { console.error("Error fetching room_types:", e); throw e; }),
        getDocs(collection(db, "guests")).catch(e => { console.error("Error fetching guests:", e); throw e; })
      ]);
      
      console.log(`[GET /api/rooms] Found ${roomsSnapshot.size} rooms, ${roomTypesSnapshot.size} types, and ${guestsSnapshot.size} guests`);

      const roomTypes = roomTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const guestsMap = new Map(guestsSnapshot.docs.map(doc => [doc.id, doc.data()]));
      
      const rooms = roomsSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        const type = roomTypes.find((t: any) => t.id === data.type_id);
        return {
          id: doc.id,
          ...data,
          type: type?.name || "Unknown Type",
          price: type?.base_price || 0,
          capacity: type?.capacity || 0,
          facilities: type?.facilities || [],
          imageUrl: type?.image_url || null
        };
      });

      // Fetch all reservations for filtering
      const resQuery = query(
        collection(db, "reservations"),
        where("reservation_status", "!=", "CANCELLED")
      );
      const resSnapshot = await getDocs(resQuery).catch(e => {
        console.warn("[api/rooms] Reservation query != failed, trying simple query", e.message);
        return getDocs(collection(db, "reservations"));
      });
      
      const allResvs = resSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      console.log(`[api/rooms] Found ${allResvs.length} active/total reservations`);
      
      // Filter reservations relevant to the targetDate in memory
      const activeReservations = allResvs.filter(r => 
        (r.check_in <= targetDate && r.check_out >= targetDate)
      );

      const now = new Date();
      const wibOffset = 7 * 60 * 60 * 1000;
      const serverToday = new Date(now.getTime() + wibOffset).toISOString().split('T')[0];
      
      const mappedRooms = rooms.map(room => {
        try {
          const roomResvs = activeReservations.filter((r: any) => r.room_number === room.id);
          const nightOccupant = roomResvs.find((r: any) => targetDate >= r.check_in && targetDate < r.check_out);
          const departer = roomResvs.find((r: any) => targetDate === r.check_out);

          let displayStatus = (room as any).current_status || 'AVAILABLE'; 
          
          if (nightOccupant) {
            displayStatus = nightOccupant.reservation_status;
          } else if (departer && departer.reservation_status !== 'CHECKED-OUT') {
             displayStatus = 'AVAILABLE';
          } else {
             if (targetDate !== serverToday && !['CLEANING', 'REPAIR', 'OUT-OF-ORDER'].includes((room as any).current_status)) {
               displayStatus = 'AVAILABLE';
             } else {
               displayStatus = (room as any).current_status || 'AVAILABLE';
             }
          }

          const activeGuest = nightOccupant || departer;
          const guestData = activeGuest?.guest_id ? guestsMap.get(activeGuest.guest_id.toString()) : null;
          
          return {
            ...room,
            status: displayStatus,
            guestName: guestData?.name || (activeGuest as any)?.guest_name || null,
            paymentStatus: activeGuest?.payment_status || null,
          };
        } catch (e) {
          console.error(`Error mapping room ${room.id}:`, e);
          return { ...room, status: 'AVAILABLE' };
        }
      });

      console.log(`[api/rooms] Returning ${mappedRooms.length} rooms`);
      res.json(mappedRooms);
    } catch (error: any) {
      console.error("[api/rooms] Detailed Error:", error);
      res.status(500).json({ 
        error: "Failed to fetch rooms",
        message: error.message
      });
    }
  });

  app.get("/api/room-types", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "room_types"));
      const types = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(types);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch room types" });
    }
  });

  app.post("/api/upload", isAuthenticated, isAdmin, upload.single("photo"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  app.get("/api/guests", isAuthenticated, async (req, res) => {
    try {
      const gSnapshot = await getDocs(collection(db, "guests"));
      const rSnapshot = await getDocs(collection(db, "reservations"));
      const roomSnapshot = await getDocs(collection(db, "rooms"));
      const typeSnapshot = await getDocs(collection(db, "room_types"));

      const guests = gSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const reservations = rSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const rooms = roomSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const roomTypes = typeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const mappedGuests = guests.map((guest: any) => {
        // Find latest reservation
        const guestResvs = reservations
          .filter((res: any) => res.guest_id === guest.id)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const latestRes = guestResvs[0];
        const room = rooms.find((r: any) => r.id === latestRes?.room_number);
        const roomType = roomTypes.find((rt: any) => rt.id === room?.type_id);

        return {
          ...guest,
          roomNumber: room?.room_number || null,
          roomType: roomType?.name || null,
          status: latestRes?.reservation_status || null,
          checkIn: latestRes?.check_in || null,
          checkOut: latestRes?.check_out || null,
          paymentStatus: latestRes?.payment_status || null,
        };
      });

      res.json(mappedGuests);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch guests" });
    }
  });

  app.patch("/api/guests/:id", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { name, phoneNumber, idNumber } = req.body;
    try {
      await updateDoc(doc(db, "guests", id), {
        name,
        phone_number: phoneNumber,
        id_number: idNumber
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal memperbarui data tamu" });
    }
  });

  app.post("/api/reservations", isAuthenticated, async (req, res) => {
    const { name, idNumber, phoneNumber, checkIn, checkOut, totalNights, rooms, roomNumber, totalPayment, batchId, paymentMethod, downPayment } = req.body;
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const hotelToday = new Date(now.getTime() + wibOffset).toISOString().split('T')[0];
    
    const finalBatchId = batchId || `B-${Date.now()}`;
    const pMethod = paymentMethod || 'Tunai';

    const roomItems = rooms && Array.isArray(rooms) 
      ? rooms 
      : [{ roomNumber, totalPayment }];

    try {
      // 1. Check for Overlaps for all rooms in the batch
      const overlaps: string[] = [];
      for (const item of roomItems) {
        if (!item.roomNumber) continue;
        
        const q = query(
          collection(db, "reservations"),
          where("room_number", "==", item.roomNumber),
          where("reservation_status", "!=", "CANCELLED")
        );
        const existingDocs = await getDocs(q);
        
        for (const docSnap of existingDocs.docs) {
          const r = docSnap.data();
          if (checkIn < r.check_out && checkOut > r.check_in) {
             const guestDoc = await getDoc(doc(db, "guests", r.guest_id));
             overlaps.push(`Unit ${item.roomNumber} sudah terisi oleh ${guestDoc.data()?.name} (${r.check_in} s/d ${r.check_out})`);
          }
        }
      }

      if (overlaps.length > 0) {
        return res.status(400).json({ error: overlaps.join(", ") });
      }

      await runTransaction(db, async (transaction) => {
        // Upsert guest
        const gQuery = query(collection(db, "guests"), where("id_number", "==", idNumber));
        const guestQuerySnap = await getDocs(gQuery);
        
        let guestRef;
        if (!guestQuerySnap.empty) {
          guestRef = guestQuerySnap.docs[0].ref;
          transaction.update(guestRef, { name, phone_number: phoneNumber });
        } else {
          guestRef = doc(collection(db, "guests"));
          transaction.set(guestRef, { name, id_number: idNumber, phone_number: phoneNumber });
        }
        
        const guestId = guestRef.id;

        for (const item of roomItems) {
          if (!item.roomNumber) continue;
          
          // Create reservation
          const resRef = doc(collection(db, "reservations"));
          const dpAmount = parseInt(downPayment) || 0;
          const totalPaying = item.totalPayment || 0;

          transaction.set(resRef, {
            guest_id: guestId,
            room_number: item.roomNumber,
            check_in: checkIn,
            check_out: checkOut,
            total_nights: totalNights,
            total_payment: totalPaying,
            amount_paid: dpAmount, // Set initial paid amount to DP
            down_payment: dpAmount,
            batch_id: finalBatchId,
            payment_method: pMethod,
            payment_status: dpAmount >= totalPaying && totalPaying > 0 ? 'Lunas' : 'Belum Lunas',
            reservation_status: 'BOOKED',
            created_at: new Date().toISOString()
          });

          // Record as transaction if DP is paid
          if (dpAmount > 0) {
            const transRef = doc(collection(db, "transactions"));
            transaction.set(transRef, {
              reservation_id: resRef.id,
              amount: dpAmount,
              payment_method: pMethod,
              type: 'DP',
              timestamp: new Date().toISOString(),
              remark: 'Down Payment awal'
            });
          }

          // ONLY update room operational status ONLY if checkIn is today (WIB)
          if (checkIn === hotelToday) {
            const roomRef = doc(db, "rooms", item.roomNumber);
            transaction.update(roomRef, { current_status: 'BOOKED' });
          }
        }
      });

      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create reservation" });
    }
  });

  app.get("/api/reservations", isAuthenticated, async (req, res) => {
    try {
      const q = query(
        collection(db, "reservations"),
        where("reservation_status", "!=", "CANCELLED"),
        orderBy("created_at", "desc")
      );
      const resSnapshot = await getDocs(q);
      
      // Fetch all dependent data in parallel to avoid N+1 queries
      const [guestsSnap, roomsSnap, typesSnap] = await Promise.all([
        getDocs(collection(db, "guests")),
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "room_types"))
      ]);

      const guestsMap = new Map(guestsSnap.docs.map(d => [d.id.toString(), d.data()]));
      const roomsMap = new Map(roomsSnap.docs.map(d => [d.id.toString(), d.data()]));
      const typesMap = new Map(typesSnap.docs.map(d => [d.id.toString(), d.data()]));
      
      const reservations = resSnapshot.docs.map(docSnap => {
        const resData = docSnap.data() as any;
        
        // Handle both string IDs and Reference objects
        const getRawId = (val: any) => {
          if (!val) return null;
          if (typeof val === 'string' || typeof val === 'number') return val.toString();
          if (val.id) return val.id;
          return val.toString();
        };

        const guestIdStr = getRawId(resData.guest_id);
        const roomNumStr = getRawId(resData.room_number);

        const guestData = guestIdStr ? guestsMap.get(guestIdStr) : null;
        const roomData = roomNumStr ? roomsMap.get(roomNumStr) : null;
        const typeData = roomData ? typesMap.get(getRawId(roomData.type_id)) : null;

        return {
          ...resData,
          id: docSnap.id,
          guest_name: guestData?.name || "Unknown Guest",
          guest_phone: guestData?.phone_number || guestData?.phoneNumber || "",
          guest_id_number: guestData?.id_number || guestData?.idNumber || "",
          room_type: typeData?.name || "Standard",
          room_number: roomNumStr // Ensure it's returned as string
        };
      });

      res.json(reservations);
    } catch (error) {
      console.error("[api/reservations] Error:", error);
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  });

  app.patch("/api/reservations/:id/payment", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { status, amountPaid, paymentMethod, discountType, discountAmount } = req.body;
    try {
      await runTransaction(db, async (transaction) => {
        const resRef = doc(db, "reservations", id);
        const resSnap = await transaction.get(resRef);
        if (!resSnap.exists()) throw new Error("Reservation not found");
        
        const resData = resSnap.data();
        const oldPaid = resData.amount_paid || 0;
        const newPaid = amountPaid !== undefined ? amountPaid : oldPaid;
        const diff = newPaid - oldPaid;

        transaction.update(resRef, {
          payment_status: status,
          amount_paid: newPaid,
          payment_method: paymentMethod || resData.payment_method || 'Tunai',
          discount_type: discountType || resData.discount_type || null,
          discount_amount: discountAmount !== undefined ? discountAmount : (resData.discount_amount || 0)
        });

        // Record a transaction log if more money was paid
        if (diff > 0) {
          const transRef = doc(collection(db, "transactions"));
          const isLunasNow = status === 'Lunas';
          
          transaction.set(transRef, {
            reservation_id: id,
            amount: diff,
            payment_method: paymentMethod || resData.payment_method || 'Tunai',
            type: isLunasNow ? 'Pelunasan' : 'Angsuran',
            timestamp: new Date().toISOString(),
            remark: isLunasNow ? 'Pelunasan tagihan' : 'Pembayaran angsuran / mencicil'
          });
        }
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Gagal memperbarui status pembayaran" });
    }
  });

  app.get("/api/reservations/:id/transactions", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
      const q = query(
        collection(db, "transactions"),
        where("reservation_id", "==", id),
        orderBy("timestamp", "asc")
      );
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(transactions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.patch("/api/rooms/:id/status", isAuthenticated, async (req, res) => {
    const { status, date, walkInGuest } = req.body;
    const { id } = req.params;
    
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const serverToday = new Date(now.getTime() + wibOffset).toISOString().split('T')[0];
    const targetDate = date || serverToday;

    console.log(`[STATUS UPDATE] Room: ${id}, New Status: ${status}, Date: ${targetDate}`);

    try {
      await runTransaction(db, async (transaction) => {
        const operationalStatus = status === 'CANCELLED' ? 'AVAILABLE' : status;
        transaction.update(doc(db, "rooms", id), { current_status: operationalStatus });
        
        if (status === 'CHECKED-IN' && walkInGuest) {
          const { name, phoneNumber, idNumber, paymentStatus, paymentAmount, paymentMethod } = walkInGuest;
          
          // Get room price for walk-in
          const roomSnap = await transaction.get(doc(db, "rooms", id));
          const roomData = roomSnap.data();
          const typeSnap = await transaction.get(doc(db, "room_types", roomData?.type_id));
          const typeData = typeSnap.data();
          const basePrice = typeData?.base_price || 0;

          const gQuery = query(collection(db, "guests"), where("id_number", "==", idNumber));
          const guestSnapshot = await getDocs(gQuery);
          
          let guestId;
          if (!guestSnapshot.empty) {
            guestId = guestSnapshot.docs[0].id;
            transaction.update(guestSnapshot.docs[0].ref, { name, phone_number: phoneNumber });
          } else {
            const guestRef = doc(collection(db, "guests"));
            transaction.set(guestRef, { name, id_number: idNumber, phone_number: phoneNumber });
            guestId = guestRef.id;
          }
          
          const checkOutDate = new Date(new Date(targetDate).getTime() + 86400000).toISOString().split('T')[0];
          const resRef = doc(collection(db, "reservations"));
          const amountPaid = parseInt(paymentAmount as any) || 0;
          const pStatus = paymentStatus || (amountPaid >= basePrice ? 'Lunas' : 'Belum Lunas');

          transaction.set(resRef, {
            guest_id: guestId,
            room_number: id,
            check_in: targetDate,
            check_out: checkOutDate,
            total_nights: 1,
            total_payment: basePrice,
            amount_paid: amountPaid,
            down_payment: pStatus === 'Lunas' ? 0 : amountPaid,
            payment_status: pStatus,
            payment_method: paymentMethod || 'Tunai',
            reservation_status: 'CHECKED-IN',
            created_at: new Date().toISOString()
          });

          if (amountPaid > 0) {
            const transRef = doc(collection(db, "transactions"));
            transaction.set(transRef, {
              reservation_id: resRef.id,
              amount: amountPaid,
              payment_method: paymentMethod || 'Tunai',
              type: pStatus === 'Lunas' ? 'Pelunasan' : 'DP',
              timestamp: new Date().toISOString(),
              remark: 'Pembayaran walk-in'
            });
          }
        } else {
           // Resolve reservation update for existing bookings
           let priorityStatus: string | null = null;
           if (status === 'CHECKED-IN') priorityStatus = 'BOOKED';
           if (status === 'CHECKED-OUT') priorityStatus = 'CHECKED-IN';
           
           const rQuery = query(
             collection(db, "reservations"),
             where("room_number", "==", id),
             where("check_in", "<=", targetDate),
             where("check_out", ">=", targetDate)
           );
           
           const resSnapshot = await getDocs(rQuery);

           let docToUpdate;
           if (priorityStatus) {
              docToUpdate = resSnapshot.docs.find(d => d.data().reservation_status === priorityStatus);
           }
           
           if (!docToUpdate) {
             docToUpdate = resSnapshot.docs.find(d => d.data().reservation_status !== 'CANCELLED');
           }

           if (docToUpdate) {
             transaction.update(docToUpdate.ref, { reservation_status: status });
           }
        }
      });
      
      res.json({ success: true, updated: true });
    } catch (error) {
      console.error("[STATUS UPDATE] Error:", error);
      res.status(500).json({ error: "Gagal memperbarui database. Silakan coba lagi." });
    }
  });

  app.patch("/api/room-types/:id", isAuthenticated, isAdmin, async (req, res) => {
    const { description, base_price, capacity, facilities, imageUrl } = req.body;
    const { id } = req.params;
    try {
      await updateDoc(doc(db, "room_types", id), {
        description,
        base_price,
        capacity,
        facilities,
        image_url: imageUrl
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update room type" });
    }
  });

  app.post("/api/room-types", isAuthenticated, isAdmin, async (req, res) => {
    const { name, description, base_price, capacity, facilities, imageUrl } = req.body;
    try {
      const docRef = await addDoc(collection(db, "room_types"), {
        name,
        description,
        base_price,
        capacity,
        facilities,
        image_url: imageUrl
      });
      res.status(201).json({ success: true, id: docRef.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal menambah tipe kamar" });
    }
  });

  app.post("/api/room-types/bulk-price", isAuthenticated, isAdmin, async (req, res) => {
    const { updates } = req.body;
    try {
      await runTransaction(db, async (transaction) => {
        for (const update of updates) {
          transaction.update(doc(db, "room_types", update.id), { base_price: update.price });
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal memperbarui harga kamar" });
    }
  });

  app.delete("/api/room-types/:id", isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const q = query(collection(db, "rooms"), where("type_id", "==", id));
      const roomsSnapshot = await getDocs(q);
      if (!roomsSnapshot.empty) {
        return res.status(400).json({ error: "Tidak bisa menghapus tipe kamar yang masih memiliki unit aktif" });
      }
      await deleteDoc(doc(db, "room_types", id));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal menghapus tipe kamar" });
    }
  });

  app.post("/api/rooms", isAuthenticated, isAdmin, async (req, res) => {
    const { roomNumber, typeId, floor } = req.body;
    try {
      const roomSnap = await getDoc(doc(db, "rooms", roomNumber));
      if (roomSnap.exists()) {
        return res.status(400).json({ error: "Nomor kamar sudah ada" });
      }
      await setDoc(doc(db, "rooms", roomNumber), {
        type_id: typeId,
        floor: floor,
        current_status: 'AVAILABLE'
      });
      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal menambah unit kamar" });
    }
  });

  app.delete("/api/rooms/:id", isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const q = query(
        collection(db, "reservations"),
        where("room_number", "==", id),
        where("reservation_status", "!=", "CANCELLED")
      );
      const resSnapshot = await getDocs(q);
        
      if (!resSnapshot.empty) {
        return res.status(400).json({ error: "Tidak bisa menghapus kamar yang memiliki reservasi aktif" });
      }
      await deleteDoc(doc(db, "rooms", id));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal menghapus unit kamar" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
