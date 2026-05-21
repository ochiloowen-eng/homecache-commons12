export const API_BASE =
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000";

const AUTH_TOKEN_KEY = "homecache_auth_token";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: (() => {
      const token = getAuthToken();
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      if (isFormData) {
        return { ...authHeader, ...(options.headers || {}) };
      }
      return {
        "Content-Type": "application/json",
        ...authHeader,
        ...(options.headers || {}),
      };
    })(),
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  const isJson = contentType.includes("application/json");
  let payload = null;
  if (isJson) {
    try {
      payload = JSON.parse(raw || "{}");
    } catch (_error) {
      throw new Error("API returned invalid JSON. Ensure backend is running on http://localhost:4000.");
    }
  }

  if (!response.ok) {
    if (payload?.error) {
      throw new Error(payload.error);
    }
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (!isJson) {
    const preview = raw.slice(0, 80).replace(/\s+/g, " ");
    throw new Error(`Expected JSON but received non-JSON response: ${preview}`);
  }

  return payload;
}

export const api = {
  register: (payload) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request("/api/auth/logout", {
      method: "POST",
    }),
  me: () => request("/api/auth/me"),
  requestRecovery: (payload) =>
    request("/api/auth/recovery/request", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resetRecovery: (payload) =>
    request("/api/auth/recovery/reset", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getHouseholdMembers: () => request("/api/household/members"),
  getHouseholdInvites: () => request("/api/household/invites"),
  createHouseholdInvite: (payload) =>
    request("/api/household/invites", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createHouseholdMember: (payload) =>
    request("/api/household/members", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateHouseholdMember: (accountId, payload) =>
    request(`/api/household/members/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  removeHouseholdMember: (accountId) =>
    request(`/api/household/members/${accountId}`, {
      method: "DELETE",
    }),
  resetHouseholdData: () =>
    request("/api/household/reset", {
      method: "POST",
    }),
  getDashboard: () => request("/api/dashboard"),
  getMemories: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/memories${query ? `?${query}` : ""}`);
  },
  getTimeline: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/timeline${query ? `?${query}` : ""}`);
  },
  getInsights: () => request("/api/insights"),
  addMemory: (payload) =>
    request("/api/memories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateMemory: (id, payload) =>
    request(`/api/memories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getMemoryHistory: (id) => request(`/api/memories/${id}/history`),
  restoreMemoryRevision: (id, revisionId) =>
    request(`/api/memories/${id}/restore`, {
      method: "POST",
      body: JSON.stringify({ revisionId }),
    }),
  deleteMemory: (id) =>
    request(`/api/memories/${id}`, {
      method: "DELETE",
    }),
  uploadMemoryFiles: (id, files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return request(`/api/memories/${id}/files`, {
      method: "POST",
      body: formData,
    });
  },
  deleteMemoryFile: (memoryId, fileId) =>
    request(`/api/memories/${memoryId}/files/${fileId}`, {
      method: "DELETE",
    }),
  getVaults: () => request("/api/vaults"),
  addVault: (payload) =>
    request("/api/vaults", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateVault: (id, payload) =>
    request(`/api/vaults/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteVault: (id) =>
    request(`/api/vaults/${id}`, {
      method: "DELETE",
    }),
  getVaultMemories: (vaultId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/vaults/${vaultId}/memories${query ? `?${query}` : ""}`);
  },
  getMembers: () => request("/api/members"),
  getTree: () => request("/api/tree"),
  getSettings: () => request("/api/settings"),
  updateSetting: (id, enabled) =>
    request(`/api/settings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
};
