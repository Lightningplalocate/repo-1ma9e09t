import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      if (location.pathname !== "/login") location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ---- Types ----
export interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  student_no?: string;
  gender?: string;
  birth_date?: string;
  role: string;
  permissions: string[];
  department_id?: number | null;
  department_name?: string | null;
  is_active: boolean;
}

// 触发后端文件（Word/Excel/模板）下载
export async function downloadFile(url: string, filename: string) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export interface MetaItem {
  key: string;
  label: string;
}

export interface Meta {
  permissions: MetaItem[];
  roles: MetaItem[];
  default_role_permissions: Record<string, string[]>;
}

export const CRISIS_LABELS: Record<string, string> = {
  none: "正常",
  low: "轻度关注",
  medium: "中度预警",
  high: "高度预警",
};

export const CRISIS_COLORS: Record<string, string> = {
  none: "#52c41a",
  low: "#faad14",
  medium: "#fa8c16",
  high: "#f5222d",
};
