import { api } from "./api";

export const getWaitlistServices = async () => {
  const res = await api.get("/waitlist");
  return res.data;
};

export const deleteWaitlistServices = async (id: string) => {
  const res = await api.delete(`/waitlist/${id}`);
  return res.data;
};
