export type Trigger = {
  id: string;
  content: string;
  allowed_roles: string[];
};

export type StarboardSettings = {
  channel_id: string;
  threshold: number;
};
