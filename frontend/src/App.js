import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { Toaster } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/ProtectedRoute";

import PublicLayout from "@/pages/public/PublicLayout";
import Home from "@/pages/public/Home";
import ProductsList from "@/pages/public/ProductsList";
import ProductDetail from "@/pages/public/ProductDetail";
import Industries from "@/pages/public/Industries";
import Technology from "@/pages/public/Technology";
import Services from "@/pages/public/Services";
import Resources from "@/pages/public/Resources";
import EventsPublic from "@/pages/public/Events";
import Contact from "@/pages/public/Contact";
import RequestDemo from "@/pages/public/RequestDemo";
import RequestQuote from "@/pages/public/RequestQuote";

import Login from "@/pages/Login";
import AdminLayout from "@/components/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Leads from "@/pages/admin/Leads";
import Products from "@/pages/admin/Products";
import Users from "@/pages/admin/Users";
import Settings from "@/pages/admin/Settings";
import Audit from "@/pages/admin/Audit";
import RequestList from "@/pages/admin/RequestList";
import CrudPage from "@/pages/admin/CrudPage";

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
          <Routes>
            {/* Public */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<ProductsList />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/industries" element={<Industries />} />
              <Route path="/technology" element={<Technology />} />
              <Route path="/services" element={<Services />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/events" element={<EventsPublic />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/request-demo" element={<RequestDemo />} />
              <Route path="/request-quote" element={<RequestQuote />} />
            </Route>

            {/* Admin Login */}
            <Route path="/admin/login" element={<Login />} />

            {/* Admin Console */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout><Dashboard /></AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/admin/leads" element={<ProtectedRoute><AdminLayout><Leads /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/demo-requests" element={<ProtectedRoute><AdminLayout><RequestList kind="demo" /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/quote-requests" element={<ProtectedRoute><AdminLayout><RequestList kind="quote" /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/tickets" element={<ProtectedRoute><AdminLayout><RequestList kind="ticket" /></AdminLayout></ProtectedRoute>} />

            <Route path="/admin/products" element={<ProtectedRoute><AdminLayout><Products /></AdminLayout></ProtectedRoute>} />

            <Route path="/admin/categories" element={<ProtectedRoute><AdminLayout>
              <CrudPage title="Categories" resource="categories" testidPrefix="categories"
                fields={[
                  { key: "name", label: "Name *", type: "text" },
                  { key: "slug", label: "Slug *", type: "text" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "icon", label: "Icon name (lucide)", type: "text", placeholder: "Sparkles, ScanLine, Zap…" },
                ]}
                displayCols={["name", "slug", "created_at"]}
              />
            </AdminLayout></ProtectedRoute>} />

            <Route path="/admin/industries" element={<ProtectedRoute><AdminLayout>
              <CrudPage title="Industries" resource="industries" testidPrefix="industries"
                fields={[
                  { key: "name", label: "Name *", type: "text" },
                  { key: "slug", label: "Slug *", type: "text" },
                  { key: "challenge", label: "Industry Challenges", type: "textarea" },
                  { key: "image", label: "Image", type: "upload", accept: "image" },
                ]}
                displayCols={["name", "slug", "created_at"]}
              />
            </AdminLayout></ProtectedRoute>} />

            <Route path="/admin/services" element={<ProtectedRoute><AdminLayout>
              <CrudPage title="Services" resource="services" testidPrefix="services"
                fields={[
                  { key: "name", label: "Name *", type: "text" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "icon", label: "Icon", type: "text" },
                ]}
                displayCols={["name", "icon", "created_at"]}
              />
            </AdminLayout></ProtectedRoute>} />

            <Route path="/admin/blogs" element={<ProtectedRoute><AdminLayout>
              <CrudPage title="Blogs" resource="blogs" testidPrefix="blogs"
                fields={[
                  { key: "title", label: "Title *", type: "text" },
                  { key: "slug", label: "Slug", type: "text" },
                  { key: "category", label: "Category", type: "text" },
                  { key: "excerpt", label: "Excerpt", type: "textarea" },
                  { key: "content", label: "Content", type: "textarea" },
                  { key: "image", label: "Cover Image", type: "upload", accept: "image" },
                  { key: "published", label: "Published", type: "switch" },
                ]}
                displayCols={["title", "category", "created_at"]}
              />
            </AdminLayout></ProtectedRoute>} />

            <Route path="/admin/case-studies" element={<ProtectedRoute><AdminLayout>
              <CrudPage title="Case Studies" resource="case_studies" testidPrefix="cases"
                fields={[
                  { key: "title", label: "Title *", type: "text" },
                  { key: "industry", label: "Industry", type: "text" },
                  { key: "challenge", label: "Challenge", type: "textarea" },
                  { key: "solution", label: "Solution", type: "textarea" },
                  { key: "result", label: "Result", type: "textarea" },
                  { key: "image", label: "Image URL", type: "url" },
                ]}
                displayCols={["title", "industry", "created_at"]}
              />
            </AdminLayout></ProtectedRoute>} />

            <Route path="/admin/testimonials" element={<ProtectedRoute><AdminLayout>
              <CrudPage title="Testimonials" resource="testimonials" testidPrefix="testimonials"
                fields={[
                  { key: "name", label: "Name *", type: "text" },
                  { key: "title", label: "Designation", type: "text" },
                  { key: "quote", label: "Quote *", type: "textarea" },
                  { key: "rating", label: "Rating (1-5)", type: "text" },
                  { key: "image", label: "Photo", type: "upload", accept: "image" },
                ]}
                displayCols={["name", "title", "created_at"]}
              />
            </AdminLayout></ProtectedRoute>} />

            <Route path="/admin/events" element={<ProtectedRoute><AdminLayout>
              <CrudPage title="Events" resource="events" testidPrefix="events"
                fields={[
                  { key: "title", label: "Title *", type: "text" },
                  { key: "type", label: "Type (Exhibition / Webinar / Trade Show / Launch)", type: "text" },
                  { key: "location", label: "Location", type: "text" },
                  { key: "date", label: "Date (YYYY-MM-DD)", type: "text" },
                  { key: "end_date", label: "End Date (YYYY-MM-DD, optional)", type: "text" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "image", label: "Cover Image", type: "upload", accept: "image" },
                  { key: "images", label: "Gallery Images", type: "upload_multi", accept: "image" },
                  { key: "videos", label: "Videos (upload or paste YouTube URL)", type: "upload_multi", accept: "video" },
                  { key: "register_url", label: "Register / Details URL", type: "url" },
                  { key: "published", label: "Published", type: "switch" },
                ]}
                displayCols={["title", "date", "location"]}
              />
            </AdminLayout></ProtectedRoute>} />

            <Route path="/admin/dealers" element={<ProtectedRoute><AdminLayout>
              <CrudPage title="Dealers" resource="dealers" testidPrefix="dealers"
                fields={[
                  { key: "name", label: "Dealer Name *", type: "text" },
                  { key: "city", label: "City", type: "text" },
                  { key: "country", label: "Country", type: "text" },
                  { key: "contact", label: "Contact Person", type: "text" },
                  { key: "email", label: "Email", type: "text" },
                  { key: "phone", label: "Phone", type: "text" },
                ]}
                displayCols={["name", "city", "country"]}
              />
            </AdminLayout></ProtectedRoute>} />

            <Route path="/admin/users" element={<ProtectedRoute roles={["super_admin", "admin"]}><AdminLayout><Users /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute roles={["super_admin", "admin"]}><AdminLayout><Audit /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute roles={["super_admin", "admin"]}><AdminLayout><Settings /></AdminLayout></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster richColors closeButton position="top-right" />
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
