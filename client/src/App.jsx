
import React from "react";
import { Routes, Route, useParams } from "react-router-dom";

// Common Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

// Public Pages
import Home from "./pages/Home";
import Packages from "./pages/Packages";
import Destinations from "./pages/Destinations";
import PackageDetails from "./pages/PackageDetails";
import InfoPage from "./pages/InfoPage";
import About from "./pages/About";
import Contact from "./pages/Contact";

// Authentication Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Customer Pages
import Dashboard from "./pages/Dashboard";
import CustomerProfile from "./pages/CustomerProfile";
import BookPackage from "./pages/BookPackage";
import MyBookings from "./pages/MyBookings";
import Payments from "./pages/Payments";
import MyTrips from "./pages/MyTrips";
import Notifications from "./pages/Notifications";
import CustomerFeedback from "./pages/CustomerFeedback";
import WriteReview from "./pages/WriteReview";
import PackageReviews from "./pages/PackageReviews";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminInsights from "./pages/AdminInsights";
import AdminBookings from "./pages/AdminBookings";
import AdminPayments from "./pages/AdminPayments";
import AdminResources from "./pages/AdminResources";
import AdminItinerary from "./pages/AdminItinerary";
import AdminCatalog from "./pages/AdminCatalog";
import AdminCustomers from "./pages/AdminCustomers";
import AdminTrips from "./pages/AdminTrips";
import AdminNotifications from "./pages/AdminNotifications";
import AdminReports from "./pages/AdminReports";
import AdminReviews from "./pages/AdminReviews";
import AdminFeedback from "./pages/AdminFeedback";

// Review Page Wrapper
function WriteReviewPage() {
  const { bookingId } = useParams();

  return (
    <main className="container-wide py-12">
      <WriteReview bookingId={bookingId} />
    </main>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <div className="flex-1">
        <Routes>
          {/* ==================================
              PUBLIC ROUTES
          ================================== */}

          <Route path="/" element={<Home />} />

          <Route
            path="/destinations"
            element={<Destinations />}
          />

          <Route
            path="/packages"
            element={<Packages />}
          />

          <Route
            path="/packages/:id"
            element={<PackageDetails />}
          />

          <Route
            path="/about"
            element={<About />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />

          {/* ==================================
              AUTHENTICATION ROUTES
          ================================== */}

          <Route path="/login" element={<Login />} />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* ==================================
              CUSTOMER ROUTES
          ================================== */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <CustomerProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/book/:id"
            element={
              <ProtectedRoute roles={["customer"]}>
                <BookPackage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-trips"
            element={
              <ProtectedRoute>
                <MyTrips />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/feedback"
            element={
              <ProtectedRoute roles={["customer"]}>
                <CustomerFeedback />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings/:bookingId/review"
            element={
              <ProtectedRoute roles={["customer"]}>
                <WriteReviewPage />
              </ProtectedRoute>
            }
          />

          {/* ==================================
              ADMIN ROUTES
          ================================== */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/insights"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminInsights />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminBookings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminPayments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/resources"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminResources />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/itineraries"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminItinerary />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/catalog"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminCatalog />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminCustomers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/trips"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminTrips />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminNotifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reviews"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminReviews />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/feedback"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminFeedback />
              </ProtectedRoute>
            }
          />

          {/* ==================================
              VENDOR ROUTES
          ================================== */}

          <Route
            path="/vendor"
            element={
              <ProtectedRoute roles={["vendor"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ==================================
              404 NOT FOUND
          ================================== */}

          <Route
            path="*"
            element={
              <InfoPage
                title="404 - Page Not Found"
                description="The requested page does not exist."
              />
            }
          />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}
