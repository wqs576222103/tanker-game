import { post, get, del } from "@/utils/request";

export function uploadMapScript(employeeId, mapName, file) {
  const data = new FormData();
  data.append("employeeId", employeeId);
  data.append("mapName", mapName);
  data.append("file", file);
  return post("/map/upload", data);
}

export function getMapScriptList(params) {
  return get("/map/list", params);
}

export function getMapScript(id) {
  return get(`/map/${id}`);
}

export function getUserMapScripts(employeeId) {
  return get(`/map/user/${employeeId}`);
}

export function deleteMapScript(id) {
  return del(`/map/${id}`);
}
