import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  TextField,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from "@mui/material";

import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
} from "firebase/firestore";

import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// --- Category Prices ---
const CATEGORY_PRICES = {
  Shirts: 500,
  Trousers: 700,
  Jackets: 1500,
  Shoes: 1200,
  Accessories: 300,
  "Ethnic Wear": 2000,
};

const containerStyle = { width: "100%", height: "400px", borderRadius: "16px", marginTop: "20px" };
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF", "#FF4444"];

// --- Map Component ---
const MapComponent = ({ location, setLocation }) => {
  const [mapError, setMapError] = useState(false);

  if (mapError) return <Typography color="error">Google Maps failed to load.</Typography>;

  return (
    <LoadScript
      googleMapsApiKey="AIzaSyCsN0VtNMbHd96oGj7Ch16FVqHQoyT0Uqc"
      onError={(e) => {
        console.error("Google Maps failed to load", e);
        setMapError(true);
      }}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={location}
        zoom={12}
        onClick={(e) => setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
      >
        <Marker position={location} />
      </GoogleMap>
    </LoadScript>
  );
};

export default function Wholesaler() {
  const navigate = useNavigate();

  // --- State ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946 });
  const [stock, setStock] = useState({});
  const [orders, setOrders] = useState([]);
  const [wholesalerId, setWholesalerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingOrder, setPendingOrder] = useState(null);

  // --- Geolocation ---
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Geolocation error:", err)
      );
    }
  }, []);

  // --- Auth listener ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setWholesalerId(user.uid);
        const docSnap = await getDoc(doc(db, "wholesalers", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name);
          setEmail(data.email);
          setSelectedCategories(data.categories || []);
          setLocation(data.location || { lat: 12.9716, lng: 77.5946 });
        }
        await fetchStock(user.uid);
        await fetchOrders(user.uid);
      } else {
        navigate("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleQuantityChange = (category, value) => setQuantities((prev) => ({ ...prev, [category]: value }));

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Sign in first!");
    await setDoc(doc(db, "wholesalers", user.uid), {
      name,
      email,
      categories: selectedCategories,
      location,
      createdAt: new Date(),
    });
    await setDoc(doc(db, "stocks", user.uid), {}, { merge: true });
    alert("Wholesaler info saved!");
    await fetchStock(user.uid);
    await fetchOrders(user.uid);
  };

  // --- Stock Fetch/Update ---
  const fetchStock = async (uid) => {
    if (!uid) return;
    const stockSnap = await getDoc(doc(db, "stocks", uid));
    setStock(stockSnap.exists() ? stockSnap.data() : {});
  };
  const updateStock = async (orderItems, uid) => {
    if (!uid) return;
    const stockRef = doc(db, "stocks", uid);
    const stockSnap = await getDoc(stockRef);
    const existingStock = stockSnap.exists() ? stockSnap.data() : {};
    const updatedStock = { ...existingStock };
    orderItems.forEach(({ category, quantity }) => {
      updatedStock[category] = (updatedStock[category] || 0) + parseInt(quantity);
    });
    await setDoc(stockRef, updatedStock);
    setStock(updatedStock);
  };

  // --- Orders ---
  const fetchOrders = async (uid) => {
    if (!uid) return;
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const allOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const myOrders = allOrders.filter((o) => o.wholesalerId === uid);
    setOrders(myOrders);
  };

  const handlePlaceOrder = () => {
    const orderItems = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([category, qty]) => ({ category, quantity: parseInt(qty), price: CATEGORY_PRICES[category] }));

    if (!orderItems.length) return alert("Enter at least one quantity!");
    setPendingOrder({ items: orderItems, totalAmount: orderItems.reduce((sum, i) => sum + i.price*i.quantity, 0) });
    setQuantities({});
    alert("Order staged! Click 'Pay' to confirm and add to stock.");
  };

  const handlePay = async () => {
    if (!pendingOrder) return alert("No order to pay!");
    const user = auth.currentUser;
    await addDoc(collection(db, "orders"), {
      userId: user.uid,
      name,
      email,
      items: pendingOrder.items,
      totalAmount: pendingOrder.totalAmount,
      status: "Paid",
      createdAt: serverTimestamp(),
      wholesalerId: user.uid,
    });
    await updateStock(pendingOrder.items, user.uid);
    setPendingOrder(null);
    await fetchStock(user.uid);
    await fetchOrders(user.uid);
    alert("Payment recorded!");
  };

  const handleLogout = async () => {
    await auth.signOut();
    setWholesalerId(null);
    navigate("/login");
  };

  if (loading) return <Container sx={{ textAlign: "center", marginTop: "40px" }}><CircularProgress /></Container>;

  // --- Pie Chart Data ---
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const topRetailersMap = {};
  const productTotals = {};
  orders.forEach((order) => {
    const date = order.createdAt?.toDate?.() || new Date();
    if (date < thirtyDaysAgo) return;
    if (order.userId !== wholesalerId) {
      const key = order.retailerName || order.retailerEmail || "Unknown";
      topRetailersMap[key] = (topRetailersMap[key] || 0) + (order.totalAmount || 0);
    }
    order.items.forEach((item) => { productTotals[item.category] = (productTotals[item.category] || 0) + item.quantity; });
  });
  const topRetailersArray = Object.entries(topRetailersMap).map(([name, revenue]) => ({ name, revenue }));
  const productData = Object.entries(productTotals).map(([name, value]) => ({ name, value }));

  return (
    <>
      <AppBar position="static" sx={{ background: "#263238" }}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>BITSmart - Wholesaler Dashboard</Typography>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ textAlign: "center", marginTop: "40px" }}>
        <Typography variant="h4" gutterBottom>Welcome, {name}</Typography>

        {/* Self Orders */}
        <Card sx={{ p: 3, mb: 4 }}>
          <CardContent>
            <Typography variant="h6">Order Your Inventory</Typography>
            {selectedCategories.length === 0 ? (
              <Typography color="textSecondary">No categories selected.</Typography>
            ) : selectedCategories.map((cat) => (
              <TextField
                key={cat}
                label={`${cat} Quantity (₹${CATEGORY_PRICES[cat]} each)`}
                type="number"
                value={quantities[cat] || ""}
                onChange={(e) => handleQuantityChange(cat, e.target.value)}
                sx={{ width: "250px", mr: 2, mt: 2, "& .MuiInputBase-input": { fontSize: 14 } }}
              />
            ))}
            {selectedCategories.length > 0 && (
              <Button variant="contained" color="success" sx={{ mt: 3 }} onClick={handlePlaceOrder}>Place Order</Button>
            )}
            {pendingOrder && (
              <Card sx={{ mt: 2, p: 2, border: "1px solid #ccc" }}>
                <Typography>Pending Order: {pendingOrder.items.map(i => `${i.category}: ${i.quantity}`).join(", ")} | Total ₹{pendingOrder.totalAmount}</Typography>
                <Button variant="contained" color="primary" sx={{ mt: 1 }} onClick={handlePay}>Pay</Button>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Current Stock */}
        <Typography variant="h5" sx={{ mb: 2 }}>Current Stock</Typography>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow><TableCell>Category</TableCell><TableCell>Qty</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(stock).length === 0 ? (
                  <TableRow><TableCell colSpan={2}>No stock yet</TableCell></TableRow>
                ) : Object.entries(stock).map(([cat, qty]) => (
                  <TableRow key={cat}><TableCell>{cat}</TableCell><TableCell>{qty}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Retailer Orders Table */}
        <Typography variant="h5" sx={{ mb: 2 }}>Retailer Orders (Last 30 days)</Typography>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Retailer</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Total ₹</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.filter(o => o.userId !== wholesalerId).map(order => (
                  <TableRow key={order.id}>
                    <TableCell>{order.createdAt?.toDate().toLocaleString() || "—"}</TableCell>
                    <TableCell>{order.retailerName || order.retailerEmail || "Unknown"}</TableCell>
                    <TableCell>{order.items.map(i => `${i.category}: ${i.quantity}`).join(", ")}</TableCell>
                    <TableCell>₹{order.totalAmount || 0}</TableCell>
                    <TableCell>{order.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Charts */}
        <Typography variant="h5" sx={{ mb: 2 }}>Top Retailers by Revenue (30 days)</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={topRetailersArray} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {topRetailersArray.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(val) => `₹${val}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Product Orders (30 days)</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {productData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        {/* Map */}
        <Typography variant="h6" sx={{ mt: 4 }}>Store Location</Typography>
        <MapComponent location={location} setLocation={setLocation} />
      </Container>
    </>
  );
}
