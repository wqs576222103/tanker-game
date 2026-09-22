import { get, post } from "@/utils/request";

export function getOnlineBattleRooms(params) {
  return get("/online-battle/rooms", params);
}

export function getOnlineBattleRoomDetail(roomId) {
  return get(`/online-battle/room/${roomId}`);
}

export function getOnlineBattleRanking(params) {
  return get("/online-battle/ranking", params);
}
