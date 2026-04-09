export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

