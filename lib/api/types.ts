export type LinkStatus = "unread" | "read";

export type LinkRequest = {
  url: string;
  title?: string;
  summary?: string;
  skip_summary?: boolean;
};

export type LinkResponse = {
  id: number | null;
  url: string;
  title: string | null;
  category: string;
  summary: string;
  status: LinkStatus;
  status_changed_at: string | null;
};

export type LinkUpdate = {
  category?: string;
  status?: LinkStatus;
};

export type CategoryCreate = {
  name: string;
};

export type CategoryResponse = {
  name: string;
};

export type CategoryCount = {
  category: string;
  count: number;
};
