export type FormActionState = {
  readonly error?: string;
  /** Zod field paths → messages (server actions). */
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
};
