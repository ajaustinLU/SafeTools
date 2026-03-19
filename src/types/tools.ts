export interface Tool {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
}

export type CategoryId =
  | 'pdf'
  | 'image'
  | 'files'
  | 'text'
  | 'privacy'
  | 'calculators'
  | 'developer';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  tools: Tool[];
}
