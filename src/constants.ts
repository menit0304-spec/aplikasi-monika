import { Room, Guest } from "./types";

export const ROOMS: Room[] = [
  // Standard Double (Rp 225.000)
  { id: "101", type: "Standard Double", status: "AVAILABLE", floor: 1, price: 225000 },
  { id: "103", type: "Standard Double", status: "AVAILABLE", floor: 1, price: 225000 },
  { id: "104", type: "Standard Double", status: "AVAILABLE", floor: 1, price: 225000 },
  { id: "201", type: "Standard Double", status: "BOOKED", floor: 2, price: 225000 },
  { id: "202", type: "Standard Double", status: "AVAILABLE", floor: 2, price: 225000 },
  { id: "203", type: "Standard Double", status: "AVAILABLE", floor: 2, price: 225000 },
  { id: "204", type: "Standard Double", status: "AVAILABLE", floor: 2, price: 225000 },
  
  // Standard Twin (Rp 225.000)
  { id: "102", type: "Standard Twin", status: "AVAILABLE", floor: 1, price: 225000 },
  { id: "202", type: "Standard Twin", status: "AVAILABLE", floor: 2, price: 225000 }, // No 202 was listed in both Double and Twin per prompt
  
  // Deluxe Double (Rp 275.000)
  { id: "109", type: "Deluxe Double", status: "AVAILABLE", floor: 1, price: 275000 },
  { id: "111", type: "Deluxe Double", status: "CHECKED-IN", floor: 1, price: 275000 },
  { id: "112", type: "Deluxe Double", status: "AVAILABLE", floor: 1, price: 275000 },
  { id: "207", type: "Deluxe Double", status: "AVAILABLE", floor: 2, price: 275000 },
  { id: "208", type: "Deluxe Double", status: "AVAILABLE", floor: 2, price: 275000 },
  { id: "209", type: "Deluxe Double", status: "AVAILABLE", floor: 2, price: 275000 },
  
  // Deluxe Twin (Rp 275.000)
  { id: "110", type: "Deluxe Twin", status: "AVAILABLE", floor: 1, price: 275000 },
  
  // Family (Rp 375.000)
  { id: "105", type: "Family", status: "BOOKED", floor: 1, price: 375000 },
  { id: "205", type: "Family", status: "AVAILABLE", floor: 2, price: 375000 },
  { id: "206", type: "Family", status: "AVAILABLE", floor: 2, price: 375000 },
  
  // Family Plus (Rp 550.000)
  { id: "210", type: "Family Plus", status: "AVAILABLE", floor: 2, price: 550000 },
];

export const GUESTS: Guest[] = [
  {
    id: "G-001",
    name: "Bapak Adrian Wijaya",
    idNumber: "327309001288001",
    checkIn: "21 Okt 2023",
    checkOut: "24 Okt 2023",
    nights: 3,
    roomType: "Standard Double",
    roomNumber: "201",
    status: "BOOKED",
    totalPayment: 675000,
    paymentStatus: "Lunas",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDLQvnmIC_I00lEJ76zqiaUsXqeBAcknhAb24uFdCnx1ygu9dXOILeRFFoXJ1ZghCWVpT47F96yv-53FecOE4VyqiXCEFAsT_b9yH6z3TDqVSp_3OVPKbmaGW2zAbnZFRJlsR27dzPtqSWDLGZqzCmmR0d8afOZcbYrHSfGLzQLfCC4xGN1yQAOJDydWSbXNFbKIOB9_ELIvBQMq6rXmuxoiqJiRI1xzQwiRmIhsVx8LBL9iBZNLbGc5eOc6PFyHsWVCluXVhmEsMyn"
  },
  {
    id: "G-002",
    name: "Amanda Sulistyo",
    idNumber: "327309001288002",
    checkIn: "12 Okt 2023",
    checkOut: "15 Okt 2023",
    roomType: "Deluxe Double",
    roomNumber: "111",
    status: "CHECKED-IN",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBz-oiHSvSvOu4LQzzI3E7z4XqIxJrQYmAk3BK_-0dmtvhVSXAf8jzzdqCAoVxgYL2ZpzlTFWpZzq82TjA6VssVP4FCwOgZir6elePQY7LyX2H0Am3vXd7kB2ZaE_Tf1bsu4QxiYOpg8dPXWBypOEDoVk8jN-P6FQ_Nv4cU-yodfRU4l255sgG00qrNCKR4ELcBF4Hxr-rST4u_uKqGS1Jk_aNcBUeXX3ubl7AKf2qQzCCCBCmqxB0ZMXyB2dhLun0qrh4JS-Lh0KFL"
  }
];
