// capstone-wasm ships types at dist/index.d.ts but its package.json "exports"
// doesn't advertise a "types" condition, so TS can't resolve them. Declare the
// minimal surface we use here.
declare module "capstone-wasm" {
  export function loadCapstone(): Promise<void>;

  export interface CsInsn {
    id: number;
    address: number | bigint;
    size: number;
    bytes: Uint8Array;
    mnemonic: string;
    opStr: string;
  }

  export class Capstone {
    constructor(arch: number, mode: number);
    disasm(
      data: number[] | Uint8Array,
      options?: { address?: number | bigint; count?: number },
    ): CsInsn[];
    close(): void;
  }

  export const Const: Record<string, number>;
}
