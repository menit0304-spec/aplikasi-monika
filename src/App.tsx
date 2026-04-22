import { useState, useEffect } from "react";
import React from "react";
import { 
  Menu, 
  LayoutDashboard, 
  Hotel, 
  Calendar, 
  Users, 
  Wallet, 
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
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [currentView, setCurrentView] = useState<View>("home");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<UserType | null>({ 
    id: 1, 
    username: "public", 
    fullName: "Public Manager", 
    isAdmin: true 
  });
  const [sessionLoading, setSessionLoading] = useState(false);
  const [accessMode, setAccessMode] = useState<"not-selected" | "guest" | "authorized">("authorized");
  
  useEffect(() => {
    checkSession();

    const handleAuthFailure = (e: any) => {
      // Just log - don't kick out for public mode
      console.warn("Auth failure ignored in public mode", e.detail);
    };

    window.addEventListener("auth-failure", handleAuthFailure);
    return () => window.removeEventListener("auth-failure", handleAuthFailure);
  }, []);

  const checkSession = async () => {
    // Session check disabled for public mode
    setSessionLoading(false);
  };

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

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
          readOnly={false}
        />;
      case "guests":
        return <GuestList />;
      case "units":
        return <RoomManagement />;
      case "search":
        return <SearchCalendar />;
      case "booking":
        return <BookingForm 
          initialRoomNumber={bookingRoom?.id} 
          initialRoomType={bookingRoom?.type} 
        />;
      case "staff":
        return <StaffManagement />;
      case "room-detail":
        return <RoomDetail 
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
          readOnly={false}
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
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Akses Publik</span>
            <span className="text-xs font-headline font-black text-on-surface">FULL CONTROL</span>
          </div>
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
