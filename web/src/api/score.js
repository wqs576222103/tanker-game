import { post, get } from "@/utils/request";

export function saveGameKills(employeeId, kills, bossKills) {
  return post("/score/kills", { employeeId, kills, bossKills });
}

export function addDeath(employeeId) {
  return post("/score/deaths", { employeeId });
}

export function getScore(employeeId) {
  return get("/score", { employeeId });
}
