export const getToken = () => {
    return localStorage.getItem("tanke-userToken");
};

export const setToken = (token) => {
    localStorage.setItem("tanke-userToken", token);
};

export const getUserInfo = () => {
    return JSON.parse(localStorage.getItem("tanke-userInfo") || '{}');
};
export const setUserInfo = (userInfo) => {
    localStorage.setItem("tanke-userInfo", JSON.stringify(userInfo));
};