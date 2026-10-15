export type UserRole = 'SALES' | 'REVIEWER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type UserSummary = Pick<User, 'id' | 'name' | 'role'>;

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
