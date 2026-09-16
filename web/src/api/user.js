import { get } from "@/utils/request";

export function getUserInfoByToken(token) {
  return get(`/user/infoByToken`, { token });
}

export function getUserList(params) {
  return get(`/user/list`, params);
}
