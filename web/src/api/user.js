import { get } from "@/utils/request";

export function getUserInfoByToken(token) {
  return get(`/user/infoByToken`, { token });
}
