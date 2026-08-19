import { post, get } from "@/utils/request";

export function uploadAiScript(employeeId, file) {
  const data = new FormData();
  data.append("employeeId", employeeId);
  data.append("file", file);
  return post("/ai/upload", data);
}

export function getAiScript(employeeId) {
  return get("/ai", { employeeId });
}
