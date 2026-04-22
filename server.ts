import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import cookieSession from "cookie-session";
import multer from "multer";
import cors from "cors";
import fs from "fs";

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

const db = new Database("hotel_monika.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'staff',
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS room_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    base_price INTEGER NOT NULL,
    capacity TEXT DEFAULT '2 Orang',
    facilities TEXT DEFAULT 'Wifi, AC, TV'
  );

  CREATE TABLE IF NOT EXISTS rooms (
    room_number TEXT PRIMARY KEY,
    type_id INTEGER NOT NULL,
    floor INTEGER NOT NULL,
    current_status TEXT DEFAULT 'AVAILABLE',
    FOREIGN KEY (type_id) REFERENCES room_types(id)
  );

  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    id_number TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    email TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    room_number TEXT NOT NULL,
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    total_nights INTEGER NOT NULL,
    total_payment INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'Belum Lunas',
    reservation_status TEXT DEFAULT 'BOOKED',
    payment_method TEXT DEFAULT 'Tunai',
    batch_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES guests(id),
    FOREIGN KEY (room_number) REFERENCES rooms(room_number)
  );
`);

// Migrations for existing databases
const migrations = [
  "ALTER TABLE room_types ADD COLUMN capacity TEXT DEFAULT '2 Orang'",
  "ALTER TABLE room_types ADD COLUMN facilities TEXT DEFAULT 'Wifi, AC, TV'",
  "ALTER TABLE guests ADD COLUMN image_url TEXT",
  "ALTER TABLE guests ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
  "ALTER TABLE reservations ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
  "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0",
  "ALTER TABLE room_types ADD COLUMN image_url TEXT",
  "ALTER TABLE reservations ADD COLUMN payment_method TEXT DEFAULT 'Tunai'",
  "ALTER TABLE reservations ADD COLUMN batch_id TEXT",
  "ALTER TABLE reservations ADD COLUMN discount_type TEXT",
  "ALTER TABLE reservations ADD COLUMN discount_amount INTEGER DEFAULT 0",
  "ALTER TABLE reservations ADD COLUMN amount_paid INTEGER DEFAULT 0",
  "ALTER TABLE reservations ADD COLUMN down_payment INTEGER DEFAULT 0"
];

migrations.forEach(m => {
  try {
    db.exec(m);
  } catch (e) {
    // Ignore errors for already existing columns
  }
});

// Seed Initial Data if empty
const roomTypeCount = db.prepare("SELECT count(*) as count FROM room_types").get() as { count: number };
if (roomTypeCount.count === 0) {
  const insertType = db.prepare("INSERT INTO room_types (name, description, base_price, capacity, facilities) VALUES (?, ?, ?, ?, ?)");
  insertType.run("Standard Double", "Kamar standar dengan tempat tidur Double", 225000, "2 Orang", "Wifi, AC, TV, Hot Water");
  insertType.run("Standard Twin", "Kamar standar dengan tempat tidur Twin", 225000, "2 Orang", "Wifi, AC, TV, Hot Water");
  insertType.run("Deluxe Double", "Kamar mewah dengan tempat tidur Double", 275000, "2 Orang", "Wifi, AC, TV, Hot Water, Mini Bar");
  insertType.run("Deluxe Twin", "Kamar mewah dengan tempat tidur Twin", 275000, "2 Orang", "Wifi, AC, TV, Hot Water, Mini Bar");
  insertType.run("Family", "Kamar keluarga yang luas", 375000, "3-4 Orang", "Wifi, AC, Smart TV, Hot Water, Living Area");
  insertType.run("Family Plus", "Kamar keluarga dengan fasilitas tambahan", 550000, "4-6 Orang", "Wifi, AC, 2 Smart TV, Hot Water, Pantry");

  const types = db.prepare("SELECT id, name FROM room_types").all() as { id: number, name: string }[];
  const getType = (name: string) => types.find(t => t.name === name)?.id;

  const insertRoom = db.prepare("INSERT INTO rooms (room_number, floor, type_id) VALUES (?, ?, ?)");
  
  // Floor 1
  ["101", "103", "104"].forEach(num => insertRoom.run(num, 1, getType("Standard Double")));
  ["102"].forEach(num => insertRoom.run(num, 1, getType("Standard Twin")));
  ["105"].forEach(num => insertRoom.run(num, 1, getType("Family")));
  ["109", "111", "112"].forEach(num => insertRoom.run(num, 1, getType("Deluxe Double")));
  ["110"].forEach(num => insertRoom.run(num, 1, getType("Deluxe Twin")));

  // Floor 2
  ["201", "203", "204"].forEach(num => insertRoom.run(num, 2, getType("Standard Double")));
  ["202"].forEach(num => insertRoom.run(num, 2, getType("Standard Twin")));
  ["205", "206"].forEach(num => insertRoom.run(num, 2, getType("Family")));
  ["207", "208", "209"].forEach(num => insertRoom.run(num, 2, getType("Deluxe Double")));
  ["210"].forEach(num => insertRoom.run(num, 2, getType("Family Plus")));
}

// Clear all users for public mode
try {
  db.prepare("DELETE FROM users").run();
  console.log("SEEDED: All users cleared for public access mode.");
  
  // Total purge of guests and reservations as requested
  db.prepare("DELETE FROM reservations").run();
  db.prepare("DELETE FROM guests").run();
  
  // Reset room operational statuses to AVAILABLE
  db.prepare("UPDATE rooms SET current_status = 'AVAILABLE'").run();

  // Specific room deletion as requested
  db.prepare("DELETE FROM rooms WHERE room_number IN ('107', '108')").run();
  
  console.log("CLEANUP: All guest and reservation data has been purged.");
} catch (error) {
  console.error("SEED ERROR (Cleanup Data):", error);
}

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
  app.post("/api/login", (req, res) => {
    // In public mode, any login succeeds as the mock user
    res.json({ 
      id: 1, 
      username: "public", 
      fullName: "Public Manager", 
      isAdmin: true 
    });
  });

  app.post("/api/logout", (req, res) => {
    req.session = null;
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    // Always return the mock admin user in public mode
    res.json({ 
      id: 1, 
      username: "public", 
      fullName: "Public Manager", 
      isAdmin: true,
      authenticated: true 
    });
  });

  // User Management (Admin Only)
  app.get("/api/users", isAuthenticated, isAdmin, (req, res) => {
    const users = db.prepare("SELECT id, username, full_name as fullName, role, is_admin as isAdmin FROM users").all();
    res.json(users);
  });

  app.post("/api/users", isAuthenticated, isAdmin, (req, res) => {
    const { username, password, fullName, role, isAdmin } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO users (username, password, full_name, role, is_admin) VALUES (?, ?, ?, ?, ?)")
        .run(username, hashedPassword, fullName, role, isAdmin ? 1 : 0);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, isAdmin, (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === req.session.userId) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // API Endpoints
  app.get("/api/rooms", (req, res) => {
    const { date } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];

    try {
      // Get all rooms and their types
      const rooms = db.prepare(`
        SELECT r.room_number as id, rt.name as type, r.current_status as status, r.floor, rt.base_price as price, rt.capacity, rt.facilities, rt.image_url as imageUrl
        FROM rooms r
        JOIN room_types rt ON r.type_id = rt.id
      `).all() as any[];

      // Get reservations active for the target date
      // Include guest information
      const activeReservations = db.prepare(`
        SELECT res.room_number, res.reservation_status, res.check_in, res.check_out, res.payment_status as paymentStatus, g.id as guestId, g.name as guestName, g.phone_number as phoneNumber
        FROM reservations res
        JOIN guests g ON res.guest_id = g.id
        WHERE ? >= res.check_in AND ? <= res.check_out
        AND res.reservation_status != 'CANCELLED'
      `).all(targetDate, targetDate) as any[];

      // Detect "Today" in Hotel's timezone (WIB - UTC+7)
      // This ensures that when targetDate matches the hotel's concept of today, 
      // we correctly show the operational status.
      const now = new Date();
      const wibOffset = 7 * 60 * 60 * 1000;
      const serverToday = new Date(now.getTime() + wibOffset).toISOString().split('T')[0];
      
      console.log(`[GET /api/rooms] Target: ${targetDate}, Hotel Today: ${serverToday}`);

      const mappedRooms = rooms.map(room => {
        const roomResvs = activeReservations.filter(r => r.room_number === room.id);
        
        // Night Occupant: Actually staying the night of targetDate
        const nightOccupant = roomResvs.find(r => targetDate >= r.check_in && targetDate < r.check_out);
        
        // Departer: Scheduled to leave on targetDate
        const departer = roomResvs.find(r => targetDate === r.check_out);

        let displayStatus = room.status; 
        let hasPendingCheckOut = false;
        
        if (nightOccupant) {
          // Night Occupancy has absolute priority
          displayStatus = nightOccupant.reservation_status;
        } else if (departer && departer.reservation_status !== 'CHECKED-OUT') {
           // On departure day, if NO new guest is staying tonight, mark as available for booking
           // but signal that a manual check-out is pending
           displayStatus = 'AVAILABLE';
           hasPendingCheckOut = true;
        } else {
           // Truly available or special operational status
           if (targetDate !== serverToday && !['CLEANING', 'REPAIR', 'OUT-OF-ORDER'].includes(room.status)) {
             displayStatus = 'AVAILABLE';
           } else {
             displayStatus = room.status;
           }
        }

        const activeGuest = nightOccupant || departer;

        return {
          ...room,
          id: room.id.toString(),
          status: displayStatus,
          hasPendingCheckOut,
          guestId: activeGuest?.guestId || null,
          guestName: activeGuest?.guestName || null,
          phoneNumber: activeGuest?.phoneNumber || null,
          paymentStatus: activeGuest?.paymentStatus || null,
          facilities: typeof room.facilities === 'string' ? room.facilities.split(', ') : room.facilities,
          imageUrl: room.imageUrl
        };
      });

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res.json(mappedRooms);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  app.get("/api/room-types", (req, res) => {
    const types = db.prepare("SELECT id, name, description, base_price, capacity, facilities, image_url as imageUrl FROM room_types").all();
    res.json(types);
  });

  app.post("/api/upload", isAuthenticated, isAdmin, upload.single("photo"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  app.get("/api/guests", isAuthenticated, (req, res) => {
    const guests = db.prepare(`
      SELECT g.id, g.name, g.id_number as idNumber, g.phone_number as phoneNumber, g.email, g.image_url as imageUrl, g.created_at as createdAt, 
             r.room_number as roomNumber, rt.name as roomType, res.reservation_status as status, res.check_in as checkIn, res.check_out as checkOut, res.payment_status as paymentStatus
      FROM guests g
      LEFT JOIN reservations res ON g.id = res.guest_id
      LEFT JOIN rooms r ON res.room_number = r.room_number
      LEFT JOIN room_types rt ON r.type_id = rt.id
      WHERE res.id = (SELECT MAX(id) FROM reservations WHERE guest_id = g.id) OR res.id IS NULL
    `).all();
    res.json(guests);
  });

  app.patch("/api/guests/:id", isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { name, phoneNumber, idNumber } = req.body;
    try {
      db.prepare("UPDATE guests SET name = ?, phone_number = ?, id_number = ? WHERE id = ?")
        .run(name, phoneNumber, idNumber, id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal memperbarui data tamu" });
    }
  });

  app.post("/api/reservations", isAuthenticated, (req, res) => {
    const { name, idNumber, phoneNumber, checkIn, checkOut, totalNights, rooms, roomNumber, totalPayment, batchId, paymentMethod } = req.body;
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const hotelToday = new Date(now.getTime() + wibOffset).toISOString().split('T')[0];
    
    const finalBatchId = batchId || `B-${Date.now()}`;
    const pMethod = paymentMethod || 'Tunai';

    // Support both single room (backward compatibility) and multiple rooms
    const roomItems = rooms && Array.isArray(rooms) 
      ? rooms 
      : [{ roomNumber, totalPayment }];

    try {
      // 1. Check for Overlaps for all rooms in the batch
      const overlaps: string[] = [];
      for (const item of roomItems) {
        if (!item.roomNumber) continue;
        
        // Standard Overlap Formula: (NewStart < ExEnd) AND (NewEnd > ExStart)
        // This allows NewStart == ExEnd (same day transition)
        const existing = db.prepare(`
          SELECT r.room_number, r.check_in, r.check_out, g.name as guest_name
          FROM reservations r
          JOIN guests g ON r.guest_id = g.id
          WHERE r.room_number = ? 
          AND r.reservation_status != 'CANCELLED'
          AND (? < r.check_out AND ? > r.check_in)
        `).get(item.roomNumber, checkIn, checkOut) as { room_number: string, check_in: string, check_out: string, guest_name: string } | undefined;

        if (existing) {
          overlaps.push(`Unit ${item.roomNumber} sudah terisi oleh ${existing.guest_name} (${existing.check_in} s/d ${existing.check_out})`);
        }
      }

      if (overlaps.length > 0) {
        return res.status(400).json({ error: overlaps.join(", ") });
      }

      const transaction = db.transaction(() => {
        // Upsert guest: Update guest info if exists, otherwise insert
        let guest = db.prepare("SELECT id FROM guests WHERE id_number = ?").get(idNumber) as { id: number };
        if (guest) {
          db.prepare("UPDATE guests SET name = ?, phone_number = ? WHERE id = ?")
            .run(name, phoneNumber, guest.id);
        } else {
          const result = db.prepare("INSERT INTO guests (name, id_number, phone_number) VALUES (?, ?, ?)")
            .run(name, idNumber, phoneNumber);
          guest = { id: result.lastInsertRowid as number };
        }

        for (const item of roomItems) {
          if (!item.roomNumber) continue;
          
          // Create reservation for each room
          db.prepare(`
            INSERT INTO reservations (guest_id, room_number, check_in, check_out, total_nights, total_payment, batch_id, payment_method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(guest.id, item.roomNumber, checkIn, checkOut, totalNights, item.totalPayment, finalBatchId, pMethod);

          // ONLY update room operational status ONLY if checkIn is today (WIB)
          if (checkIn === hotelToday) {
            db.prepare("UPDATE rooms SET current_status = 'BOOKED' WHERE room_number = ?").run(item.roomNumber);
          }
        }
      });

      transaction();
      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create reservation" });
    }
  });

  app.get("/api/reservations", isAuthenticated, (req, res) => {
    try {
      const reservations = db.prepare(`
        SELECT res.*, g.name as guest_name 
        FROM reservations res
        JOIN guests g ON res.guest_id = g.id
        WHERE res.reservation_status != 'CANCELLED'
        ORDER BY res.created_at DESC
      `).all();
      res.json(reservations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  });

  app.patch("/api/reservations/:id/payment", isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { status, amountPaid, downPayment, paymentMethod, discountType, discountAmount } = req.body;
    try {
      db.prepare(`
        UPDATE reservations 
        SET payment_status = ?, 
            amount_paid = COALESCE(?, amount_paid), 
            down_payment = COALESCE(?, down_payment), 
            payment_method = COALESCE(?, payment_method),
            discount_type = COALESCE(?, discount_type),
            discount_amount = COALESCE(?, discount_amount)
        WHERE id = ?
      `).run(status, amountPaid, downPayment, paymentMethod, discountType, discountAmount, id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal memperbarui status pembayaran" });
    }
  });

  app.patch("/api/rooms/:id/status", isAuthenticated, (req, res) => {
    const { status, date, walkInGuest } = req.body;
    const { id } = req.params;
    
    // Resolve "Today" correctly if date is missing
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const serverToday = new Date(now.getTime() + wibOffset).toISOString().split('T')[0];
    const targetDate = date || serverToday;

    console.log(`[STATUS UPDATE] Room: ${id}, New Status: ${status}, Date: ${targetDate}`);

    try {
      const transaction = db.transaction(() => {
        // 1. Update global room operational status
        // Special case for cancellations: if reservation is cancelled, room becomes AVAILABLE
        const operationalStatus = status === 'CANCELLED' ? 'AVAILABLE' : status;
        db.prepare("UPDATE rooms SET current_status = ? WHERE room_number = ?").run(operationalStatus, id);
        
        // 2. Handle Case: CHECKED-IN walk-in (no existing reservation)
        if (status === 'CHECKED-IN' && walkInGuest) {
          const { name, phoneNumber, idNumber } = walkInGuest;
          
          // Upsert guest
          let guest = db.prepare("SELECT id FROM guests WHERE id_number = ?").get(idNumber) as { id: number };
          if (!guest) {
            const result = db.prepare("INSERT INTO guests (name, id_number, phone_number) VALUES (?, ?, ?)")
              .run(name, idNumber, phoneNumber);
            guest = { id: result.lastInsertRowid as number };
          }
          
          // Create 1-day reservation for immediate walk-in
          const checkOutDate = new Date(new Date(targetDate).getTime() + 86400000).toISOString().split('T')[0];
          db.prepare(`
            INSERT INTO reservations (guest_id, room_number, check_in, check_out, total_nights, total_payment, reservation_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(guest.id, id, targetDate, checkOutDate, 1, 0, 'CHECKED-IN');
        } else {
          // 3. Resolve reservation update for existing bookings
          let priorityStatus = null;
          if (status === 'CHECKED-IN') priorityStatus = 'BOOKED';
          if (status === 'CHECKED-OUT') priorityStatus = 'CHECKED-IN';

          let resUpdate;
          if (priorityStatus) {
             resUpdate = db.prepare(`
              UPDATE reservations 
              SET reservation_status = ? 
              WHERE room_number = ? 
              AND (? >= check_in AND ? <= check_out)
              AND reservation_status = ?
            `).run(status, id, targetDate, targetDate, priorityStatus);
          }

          if (!resUpdate || resUpdate.changes === 0) {
            resUpdate = db.prepare(`
              UPDATE reservations 
              SET reservation_status = ? 
              WHERE room_number = ? 
              AND (? >= check_in AND ? <= check_out)
              AND reservation_status != 'CANCELLED'
            `).run(status, id, targetDate, targetDate);
          }
        }
      });
      
      transaction();
      res.json({ success: true, updated: true });
    } catch (error) {
      console.error("[STATUS UPDATE] Error:", error);
      res.status(500).json({ error: "Gagal memperbarui database. Silakan coba lagi." });
    }
  });

  app.patch("/api/room-types/:id", isAuthenticated, isAdmin, (req, res) => {
    const { description, base_price, capacity, facilities, imageUrl } = req.body;
    const { id } = req.params;
    try {
      db.prepare("UPDATE room_types SET description = ?, base_price = ?, capacity = ?, facilities = ?, image_url = ? WHERE id = ?")
        .run(description, base_price, capacity, facilities, imageUrl, id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update room type" });
    }
  });

  app.post("/api/room-types", isAuthenticated, isAdmin, (req, res) => {
    const { name, description, base_price, capacity, facilities, imageUrl } = req.body;
    try {
      const result = db.prepare("INSERT INTO room_types (name, description, base_price, capacity, facilities, image_url) VALUES (?, ?, ?, ?, ?, ?)")
        .run(name, description, base_price, capacity, facilities, imageUrl);
      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal menambah tipe kamar" });
    }
  });

  app.post("/api/room-types/bulk-price", isAuthenticated, isAdmin, (req, res) => {
    const { updates } = req.body;
    try {
      const transaction = db.transaction(() => {
        const stmt = db.prepare("UPDATE room_types SET base_price = ? WHERE id = ?");
        for (const update of updates) {
          stmt.run(update.price, update.id);
        }
      });
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal memperbarui harga kamar" });
    }
  });

  app.delete("/api/room-types/:id", isAuthenticated, isAdmin, (req, res) => {
    const { id } = req.params;
    try {
      // Check if there are rooms of this type
      const rooms = db.prepare("SELECT count(*) as count FROM rooms WHERE type_id = ?").get(id) as { count: number };
      if (rooms.count > 0) {
        return res.status(400).json({ error: "Tidak bisa menghapus tipe kamar yang masih memiliki unit aktif" });
      }
      db.prepare("DELETE FROM room_types WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal menghapus tipe kamar" });
    }
  });

  app.post("/api/rooms", isAuthenticated, isAdmin, (req, res) => {
    const { roomNumber, typeId, floor } = req.body;
    try {
      // Check if room already exists
      const existing = db.prepare("SELECT room_number FROM rooms WHERE room_number = ?").get(roomNumber);
      if (existing) {
        return res.status(400).json({ error: "Nomor kamar sudah ada" });
      }
      db.prepare("INSERT INTO rooms (room_number, type_id, floor) VALUES (?, ?, ?)")
        .run(roomNumber, typeId, floor);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal menambah unit kamar" });
    }
  });

  app.delete("/api/rooms/:id", isAuthenticated, isAdmin, (req, res) => {
    const { id } = req.params;
    try {
      // Check if there are reservations for this room
      const reservations = db.prepare("SELECT count(*) as count FROM reservations WHERE room_number = ? AND reservation_status != 'CANCELLED'").get(id) as { count: number };
      if (reservations.count > 0) {
        return res.status(400).json({ error: "Tidak bisa menghapus kamar yang memiliki reservasi aktif" });
      }
      db.prepare("DELETE FROM rooms WHERE room_number = ?").run(id);
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
