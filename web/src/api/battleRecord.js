import { post, get } from "@/utils/request";

export function saveBattleRecord(data) {
  return post("/battle-record", data);
}

export function getBattleRecordPage(params) {
  return get("/battle-record/page", params);
}

export function getBattleRecordDetail(id) {
  return get(`/battle-record/${id}`);
}

export function getEmployeeBattleRecords(employeeId, params) {
  return get(`/battle-record/employee/${employeeId}`, params);
}

export function getBattleWinRate(params) {
  return get("/battle-record/win-rate", params);
}
