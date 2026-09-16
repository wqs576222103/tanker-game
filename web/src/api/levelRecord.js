import { post, get } from "@/utils/request";

export function saveLevelRecord(data) {
  return post("/level-record", data);
}

export function getLevelRecordPage(params) {
  return get("/level-record/page", params);
}

export function getUserBestLevelRecords(employeeId) {
  return get(`/level-record/best/${employeeId}`);
}

export function getGlobalBestLevelRecords() {
  return get("/level-record/global-best");
}
