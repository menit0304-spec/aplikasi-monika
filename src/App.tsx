import { useState, useEffect } from "react";
import React from "react";
import { 
  Menu, 
  LayoutDashboard, 
  Hotel, 
  Calendar, 
  Users, 
  Wallet, 
  Banknote,
  ShieldCheck,
  LogOut,
  ChevronDown
} from "lucide-react";
import { View, Room, User as UserType } from "./types";
import Dashboard from "./screens/Dashboard";
import GuestList from "./screens/GuestList";
import RoomManagement from "./screens/RoomManagement";
import SearchCalendar from "./screens/SearchCalendar";
import BookingForm from "./screens/BookingForm";
import RoomDetail from "./screens/RoomDetail";
import StaffManagement from "./screens/StaffManagement";
import PaymentOverview from "./screens/PaymentOverview";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { login, getCurrentUser, logout } from "./services/dataService";

export default function App() {
  const [currentView, setCurrentView] = useState<View>("home");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [accessMode, setAccessMode] = useState<"not-selected" | "guest" | "authorized">("not-selected");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const handleLogin = async () => {
    setLoginError("");
    try {
      const userData = await login({ username, password });
      setUser(userData);
      setAccessMode("authorized");
      setCurrentView("home");
    } catch (e: any) {
      console.error("Login component error:", e);
      setLoginError("Username atau password salah");
    }
  };

  useEffect(() => {
    checkSession();

    const handleAuthFailure = (e: any) => {
      console.warn("Auth failure detected:", e.detail);
      setAccessMode("not-selected");
      setUser(null);
    };

    window.addEventListener("auth-failure", handleAuthFailure);
    return () => window.removeEventListener("auth-failure", handleAuthFailure);
  }, []);

  const checkSession = async () => {
    setSessionLoading(true);
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setAccessMode("authorized");
      }
    } catch (e) {
      console.error("Session check failed:", e);
    } finally {
      setSessionLoading(false);
    }
  };

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessMode("not-selected");
    } catch (e) {
      console.error(e);
      // Fallback
      setUser(null);
      setAccessMode("not-selected");
    }
  };

  const renderView = () => {
    switch (currentView) {
      case "home":
        return <Dashboard 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onViewDetail={(room) => {
            setSelectedRoom(room);
            setCurrentView("room-detail");
          }} 
          readOnly={accessMode === 'guest'}
        />;
      case "guests":
        return <GuestList 
          accessMode={accessMode}
          onPaymentClick={(name) => {
          setPaymentSearch(name);
          setCurrentView("payment");
        }} />;
      case "units":
        return <RoomManagement accessMode={accessMode} />;
      case "search":
        return <SearchCalendar />;
      case "booking":
        return <BookingForm 
          accessMode={accessMode}
          initialRoomNumber={bookingRoom?.id} 
          initialRoomType={bookingRoom?.type} 
        />;
      case "staff":
        return <StaffManagement accessMode={accessMode} />;
      case "payment":
        return <PaymentOverview 
          accessMode={accessMode}
          initialSearch={paymentSearch} 
          onSearchClear={() => setPaymentSearch("")} 
        />;
      case "room-detail":
        return <RoomDetail 
          accessMode={accessMode}
          room={selectedRoom} 
          onBack={() => setCurrentView("home")} 
          onBooking={(room) => {
            setBookingRoom(room);
            setCurrentView("booking");
          }}
          showActions={true} 
          selectedDate={selectedDate}
        />;
      default:
        return <Dashboard 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onViewDetail={(room) => {
            setSelectedRoom(room);
            setCurrentView("room-detail");
          }} 
          readOnly={accessMode === 'guest'}
        />;
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-outline">Menyiapkan Sistem...</p>
        </div>
      </div>
    );
  }

  if (accessMode === "not-selected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('https://scontent.fjog3-1.fna.fbcdn.net/v/t51.82787-15/590414953_18425348251115166_1342627587324086557_n.webp?stp=dst-jpg_tt6&_nc_cat=103&ccb=1-7&_nc_sid=13d280&_nc_ohc=_F1Rj8jxNMsQ7kNvwF2NmLt&_nc_oc=AdrELpJgS3F2nCZ_mebH1AqDxH59hGRe3a4voHrOYCmDh-7zKk-SeipVnNwB_z5SM38&_nc_zt=23&_nc_ht=scontent.fjog3-1.fna&_nc_gid=VoIcbVkrvIcEtZVw1cQ-Vg&_nc_ss=7b289&oh=00_Af2nmOwfKp77K6NcZqv5SDPds6xL23lE9NsLRNcw8yWWXQ&oe=69F5EC4A')] bg-cover bg-center">
        <div className="bg-white/90 backdrop-blur-md p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 w-full max-w-sm">
          <h1 className="font-headline tracking-tighter font-extrabold text-3xl text-primary">Hotel Monika</h1>
          
          {showLoginForm ? (
            <div className="flex flex-col gap-4 w-full">
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white border border-outline-variant rounded-xl p-4"/>
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white border border-outline-variant rounded-xl p-4"/>
              {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
              <button onClick={handleLogin} className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all">Submit</button>
              <button onClick={() => setShowLoginForm(false)} className="w-full text-outline text-xs">Back</button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              <button onClick={() => setShowLoginForm(true)} className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all">Login</button>
              <button onClick={() => setAccessMode("guest")} className="w-full bg-surface-container text-on-surface py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all">Demo</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      {/* Top App Bar */}
      <header className="bg-background/80 backdrop-blur-md flex justify-between items-center w-full px-6 h-16 sticky top-0 z-50 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button className="text-primary p-2 hover:bg-surface-container-high rounded-full active:scale-95 transition-all">
            <Menu size={24} />
          </button>
          <div 
            className="flex flex-col cursor-pointer hover:opacity-75 transition-opacity" 
            onClick={() => setCurrentView("home")}
          >
            <h1 className="font-headline tracking-tighter font-extrabold text-lg leading-tight">Hotel Monika</h1>
            <span className="text-[9px] font-bold text-outline uppercase tracking-widest hidden sm:block">Yogyakarta Management</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              {accessMode === 'guest' ? 'Akses Demo' : (user?.isAdmin ? 'Admin' : 'Staff')}
            </span>
            <span className="text-xs font-headline font-black text-on-surface">
              {accessMode === 'guest' ? 'GUEST USER' : (user?.fullName || user?.username || 'AUTHORIZED')}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-outline hover:text-error hover:bg-error/5 rounded-full transition-all"
            title="Logoout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 h-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView + accessMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar */}
      {currentView !== "login" && (
        <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pt-2 pb-6 px-4 bg-white/70 backdrop-blur-xl shadow-[0_-8px_32px_rgba(26,28,28,0.06)] border-t border-outline-variant/10">
          <NavItem 
            icon={<LayoutDashboard size={24} />} 
            label="Home" 
            active={currentView === "home" || currentView === "room-detail"} 
            onClick={() => setCurrentView("home")} 
          />
          
          <NavItem 
            icon={<Hotel size={24} />} 
            label="Booking" 
            active={currentView === "booking"} 
            onClick={() => {
              setBookingRoom(null);
              setCurrentView("booking");
            }} 
          />
          <NavItem 
            icon={<Calendar size={24} />} 
            label="Kalender" 
            active={currentView === "search"} 
            onClick={() => setCurrentView("search")} 
          />
          <NavItem 
            icon={<Wallet size={24} />} 
            label="Rooms" 
            active={currentView === "units"} 
            onClick={() => setCurrentView("units")} 
          />
          <NavItem 
            icon={<Banknote size={24} />} 
            label="Payment" 
            active={currentView === "payment"} 
            onClick={() => setCurrentView("payment")} 
          />
          <NavItem 
            icon={<Users size={24} />} 
            label="Guests" 
            active={currentView === "guests"} 
            onClick={() => setCurrentView("guests")} 
          />
          <NavItem 
            icon={<ShieldCheck size={24} />} 
            label="Staff" 
            active={currentView === "staff"} 
            onClick={() => setCurrentView("staff")} 
          />
        </nav>
      )}
    </div>
  );
}

function RedirectToHome({ onRedirect }: { onRedirect: () => void }) {
  useEffect(() => { onRedirect(); }, []);
  return null;
}

function NavItem({ 
  icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  onClick: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center px-4 py-1.5 transition-all duration-300 rounded-2xl",
        active ? "bg-primary-container text-white scale-105 shadow-md" : "text-on-surface-variant hover:text-primary"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold tracking-widest uppercase mt-1">{label}</span>
    </button>
  );
}
