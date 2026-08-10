const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

function buildUrl(path, params) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }
  return url.toString();
}

function buildOptions(method, data, headers) {
  const options = {
    method,
    headers: { ...DEFAULT_HEADERS, ...headers },
  };
  if (
    ["POST", "PUT", "PATCH"].includes(method) &&
    data &&
    typeof data === "object"
  ) {
    options.body = JSON.stringify(data);
  }
  return options;
}

function parseResponse(response) {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function request(path, options = {}) {
  const { method = "GET", params, data, headers, ...rest } = options;
  const url = buildUrl(path, params);
  const fetchOptions = buildOptions(method, data, headers);

  try {
    const response = await fetch(url, { ...fetchOptions, ...rest });
    const result = await parseResponse(response);

    if (!response.ok) {
      const error = new Error(
        result?.message || result?.msg || `HTTP ${response.status}`,
      );
      error.code = response.status;
      error.data = result;
      throw error;
    }

    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      error.code = "ABORTED";
      throw error;
    }
    if (!error.code) {
      error.code = "NETWORK_ERROR";
    }
    throw error;
  }
}

export const get = (path, params, options) =>
  request(path, { method: "GET", params, ...options });

export const post = (path, data, options) =>
  request(path, { method: "POST", data, ...options });

export const put = (path, data, options) =>
  request(path, { method: "PUT", data, ...options });

export const del = (path, params, options) =>
  request(path, { method: "DELETE", params, ...options });

export const patch = (path, data, options) =>
  request(path, { method: "PATCH", data, ...options });

export default { get, post, put, del, patch, request };
