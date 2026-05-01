const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("token");
}

function getStoredUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

async function request(method, path, body = null) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json();
  return data;
}

const api = {
  list(entity) {
    return request("GET", `/${entity}`);
  },

  create(entity, item) {
    return request("POST", `/${entity}`, item);
  },

  update(entity, id, patch) {
    return request("PUT", `/${entity}/${id}`, patch);
  },

  remove(entity, id) {
    return request("DELETE", `/${entity}/${id}`);
  },

  async login(userId, password) {
    const res = await request("POST", "/auth/login", { userId, password });
    if (res.token && res.user) {
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
    }
    return res;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  moveDealStage(dealId, stage) {
    return request("PATCH", `/deals/${dealId}/stage`, { stage });
  },

  convertLeadToCustomer(leadId, customerInput) {
    return request("POST", `/leads/${leadId}/convert`, customerInput);
  },
};

export { api, getStoredUser, getToken };
