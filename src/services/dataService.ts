async function apiFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include"
  });

  if (!response.ok) {
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent("auth-failure", { detail: errorData }));
      const authError = new Error(errorData.error || "Akses ditolak. Silakan login kembali.");
      (authError as any).status = 401;
      throw authError;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function fetchRooms(date?: string) {
  const url = date ? `/api/rooms?date=${date}` : "/api/rooms";
  return apiFetch(url);
}

export async function fetchRoomTypes() {
  return apiFetch("/api/room-types");
}

export async function fetchGuests() {
  return apiFetch("/api/guests");
}

export async function updateGuest(id: number | string, data: { name: string, phoneNumber?: string, idNumber: string }) {
  return apiFetch(`/api/guests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function fetchReservations() {
  return apiFetch("/api/reservations");
}

export async function updatePaymentStatus(id: number | string, data: { 
  status: "Lunas" | "Belum Lunas", 
  amountPaid?: number, 
  downPayment?: number,
  paymentMethod?: string,
  discountType?: string,
  discountAmount?: number
}) {
  return apiFetch(`/api/reservations/${id}/payment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function createReservation(data: any) {
  return apiFetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function updateRoomStatus(roomId: string, status: string, date?: string, walkInGuest?: { name: string, phoneNumber: string, idNumber: string }) {
  return apiFetch(`/api/rooms/${roomId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, date, walkInGuest })
  });
}

export async function updateRoomType(id: number, data: { description: string, base_price: number, capacity: string, facilities: string, imageUrl?: string }) {
  return apiFetch(`/api/room-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function addRoomType(data: { name: string, description: string, base_price: number, capacity: string, facilities: string, imageUrl?: string }) {
  return apiFetch("/api/room-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function uploadRoomPhoto(file: File) {
  const formData = new FormData();
  formData.append("photo", file);

  return apiFetch("/api/upload", {
    method: "POST",
    body: formData
  });
}

export async function updateBulkPrices(updates: { id: number, price: number }[]) {
  return apiFetch("/api/room-types/bulk-price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates })
  });
}

export async function deleteRoomType(id: number) {
  return apiFetch(`/api/room-types/${id}`, {
    method: "DELETE"
  });
}

export async function addRoom(data: { roomNumber: string, typeId: number, floor: number }) {
  return apiFetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function deleteRoom(id: string) {
  return apiFetch(`/api/rooms/${id}`, {
    method: "DELETE"
  });
}

export async function login(credentials: any) {
  // Login is special, we don't want to trigger auth-failure here if it fails with 401
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    credentials: "include"
  });
  if (!response.ok) throw new Error("Invalid login");
  return response.json();
}

export async function logout() {
  await fetch("/api/logout", { 
    method: "POST",
    credentials: "include"
  });
}

export async function getCurrentUser() {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (!response.ok) return null;
  const data = await response.json();
  if (data && data.authenticated) {
    return data;
  }
  return null;
}

export async function fetchUsers() {
  return apiFetch("/api/users");
}

export async function addUser(data: any) {
  return apiFetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function deleteUser(id: number) {
  return apiFetch(`/api/users/${id}`, {
    method: "DELETE"
  });
}
