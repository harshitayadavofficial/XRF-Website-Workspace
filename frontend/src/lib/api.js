import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      const err = JSON.parse(text);
      throw new Error(err.detail || "Export failed");
    }

    let type = contentType;
    if (filename.toLowerCase().endsWith('.pdf')) type = 'application/pdf';
    else if (filename.toLowerCase().endsWith('.csv')) type = 'text/csv';
    else if (filename.toLowerCase().endsWith('.xlsx')) type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (filename.toLowerCase().endsWith('.txt')) type = 'text/plain';

    const blob = new Blob([response.data], { type });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    toast.success("Download started");
  } catch (error) {
    console.error("Export failed:", error);
    toast.error(error.message || "Failed to download file");
  }
};
