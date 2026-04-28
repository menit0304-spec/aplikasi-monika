export type RoomStatus = "AVAILABLE" | "BOOKED" | "CHECKED-IN" | "CHECKED-OUT";

export interface Room {
  id: string;
  type: string;
  status: RoomStatus;
  floor: number;
  capacity?: string;
  facilities?: string[];
  price?: number;
  guestName?: string | null;
  guestId?: number | null;
  phoneNumber?: string | null;
  paymentStatus?: "Lunas" | "Belum Lunas" | "Lunas Online";
  imageUrl?: string;
  hasPendingCheckOut?: boolean;
}

export interface Guest {
  id: string;
  name: string;
  idNumber: string;
  phoneNumber?: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  roomNumber: string;
  status: RoomStatus;
  totalPayment?: number;
  paymentStatus?: "Lunas" | "Belum Lunas" | "Lunas Online";
  nights?: number;
  imageUrl?: string;
}

export interface Reservation {
  id: string;
  guest_id: string;
  guest_name?: string;
  guest_phone?: string;
  guest_id_number?: string;
  room_number: string;
  room_type?: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  total_payment: number;
  amount_paid?: number;
  down_payment?: number;
  discount_type?: string;
  discount_amount?: number;
  payment_status: "Lunas" | "Belum Lunas" | "Lunas Online";
  payment_method?: "Tunai" | "Transfer Bank" | string;
  reservation_status: "BOOKED" | "CHECKED-IN" | "CHECKED-OUT" | "CANCELLED";
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  isAdmin: boolean;
  role?: string;
}

export type View = "home" | "booking" | "search" | "units" | "guests" | "room-detail" | "login" | "staff" | "payment";
