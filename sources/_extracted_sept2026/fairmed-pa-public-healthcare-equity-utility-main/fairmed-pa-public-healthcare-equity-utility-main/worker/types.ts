import { GlobalDurableObject } from './durableObject';
export type DurableObjectInterface = {
  [K in keyof GlobalDurableObject]: GlobalDurableObject[K] extends (...args: any[]) => any ? GlobalDurableObject[K] : never;
};