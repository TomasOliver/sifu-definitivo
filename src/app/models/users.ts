export interface Users {
  id: string | number;
  username: string;
  password: string;
  role?: 'admin' | 'player';
}
