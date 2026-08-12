import { get } from "@/utils/request";

export function getRankList(params) {
  return get("/score/page", params);
}
