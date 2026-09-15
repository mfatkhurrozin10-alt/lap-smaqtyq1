export const getCurrentUser = () => {
  const userStr = localStorage.getItem('sim_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const saveUserSession = (userData: any) => {
  localStorage.setItem('sim_user', JSON.stringify(userData));
};

export const clearUserSession = () => {
  localStorage.removeItem('sim_user');
};