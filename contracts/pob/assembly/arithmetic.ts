export const ALPHABET = '0123456789abcdef';

export const BYTES = 32;
export const BYTE_MASK = 0xff;

export const WORDS = BYTES / 2;
export const WORD_LENGTH = 16;
export const WORD_MASK = 0xffff;

export const DWORDS = BYTES / 4;
export const DWORD_LENGTH = 32;
export const DWORD_MASK = 0xffffffff;

export const JSNUMBER_MAX_INTEGER : u64 = 9007199254740991;

export const RADIX_MIN : u64 = 2;
export const RADIX_MAX : u64 = 16;

export function fromHex(
  buffer: ArrayBuffer,
  str: string,
  prefixed: boolean
): u64 {
  if (prefixed) {
    if (str.length < 3)
      return 1;
  } else if (str.length < 1) {
   return 1;
  }
  const min = prefixed ? 2 : 0;
  const pd = Uint8Array.wrap(buffer);
  let i = 0;
  let p = str.length - 1;
  while (p >= min && i < BYTES) {
    // tslint:disable-next-line:no-increment-decrement
    let val = parseInt(str.substr(p--, 1), 16);
    if (isNaN(val)) {
      return 1;
    }
    pd[i] = val;
    if (p >= min) {
      // tslint:disable-next-line:no-increment-decrement
      val = parseInt(str.substr(p--, 1), 16);
      if (isNaN(val)) {
        return 1;
      }
      pd[i] |= val << 4;
      i += 1;
    }
  }
  return 0;
}

export function toHex(buffer: ArrayBuffer): string {
  const ret : string[] = [];
  let hasVal = false;
  const pd = Uint8Array.wrap(buffer);
  for (let i = pd.length; i; i -= 1) {
    if (!hasVal && !pd[i - 1]) {
      continue;
    }
    ret.push(ALPHABET.at(pd[i - 1] >>> 4));
    ret.push(ALPHABET.at(pd[i - 1] & 0x0f));
    hasVal = true;
  }
  while (ret.length && ret[0] === '0') {
    ret.shift();
  }
  return ret.join('') || '0';
}

export function toNumber(buffer: ArrayBuffer): u64 {
  let ret : u64 = 0;
  const pd = Uint32Array.wrap(buffer);
  for (let i = 0; i < pd.length; i += 1) {
    if (pd[i]) {
      ret += u64(pd[i] * 0x100000000 ** i);
    }
  }
  return ret;
}

export function numberToBuffer(num: u64): ArrayBuffer {
  const buffer = new ArrayBuffer(BYTES);
  const buffer32 = Uint32Array.wrap(buffer);
  buffer32[0] = u32(num & DWORD_MASK);
  buffer32[1] = u32(num / (u64(DWORD_MASK) + 1));
  return buffer;
}

export function endianConversion(inBuffer: ArrayBuffer, outBuffer: ArrayBuffer): void {
   const pd = Uint8Array.wrap(inBuffer);
   let ret = Uint8Array.wrap(outBuffer);

   for (let i = 0; i < pd.length; i += 1) {
      ret[pd.length - 1 - i] = pd[i];
   }
}

export function add(lval: ArrayBuffer, rval: ArrayBuffer): void {
  const mem = new Uint32Array(2);
  const lv = Uint16Array.wrap(lval);
  const rv = Uint16Array.wrap(rval as ArrayBuffer);
  for (let i = 0; i < WORDS; i += 1) {
    mem[0] = mem[1] + lv[i] + rv[i];
    lv[i] = mem[0] & WORD_MASK;
    mem[1] = mem[0] >>> WORD_LENGTH;
  }
}

export function addInt(lval: ArrayBuffer, rval: u64): void {
  add(lval, numberToBuffer(rval));
}

export function not(lval: ArrayBuffer): void {
  const lv = Uint32Array.wrap(lval);
  for (let i = 0; i < lv.length; i += 1) {
    lv[i] = ~lv[i];
  }
}

export function and(lval: ArrayBuffer, rval: ArrayBuffer): void {
  const lv = Uint32Array.wrap(lval);
  const rv = Uint32Array.wrap(rval as ArrayBuffer);
  for (let i = 0; i < lv.length; i += 1) {
    lv[i] &= rv[i];
  }
}

export function andInt(lval: ArrayBuffer, rval: u64): void {
  and(lval, numberToBuffer(rval))
}

export function andNot(lval: ArrayBuffer, rval: ArrayBuffer): void {
  const lv = Uint32Array.wrap(lval);
  const rv = Uint32Array.wrap(rval as ArrayBuffer);
  for (let i = 0; i < lv.length; i += 1) {
    lv[i] &= ~rv[i];
  }
}

export function andNotInt(lval: ArrayBuffer, rval: u64): void {
  andNot(lval, numberToBuffer(rval))
}

export function or(lval: ArrayBuffer, rval: ArrayBuffer): void {
  const lv = Uint32Array.wrap(lval);
  const rv = Uint32Array.wrap(rval as ArrayBuffer);
  for (let i = 0; i < lv.length; i += 1) {
    lv[i] |= rv[i];
  }
}

export function xor(lval: ArrayBuffer, rval: ArrayBuffer): void {
  const lv = Uint32Array.wrap(lval);
  const rv = Uint32Array.wrap(rval as ArrayBuffer);
  for (let i = 0; i < lv.length; i += 1) {
    lv[i] ^= rv[i];
  }
}

export function xorInt(lval: ArrayBuffer, rval: u64): void {
  xor(lval, numberToBuffer(rval));
}

export function comp(lval: ArrayBuffer): void {
  not(lval);
  addInt(lval, 1);
}

export function sub(lval: ArrayBuffer, rval: ArrayBuffer): void {
  rval = (rval as ArrayBuffer).slice(0);
  comp(rval);
  add(lval, rval);
}

export function subInt(lval: ArrayBuffer, rval: u64): void {
  sub(lval, numberToBuffer(rval));
}

export function eq(lval: ArrayBuffer, rval: ArrayBuffer): boolean {
  const lv = Uint32Array.wrap(lval);
  const rv = Uint32Array.wrap(rval as ArrayBuffer);
  for (let i = 0; i < lv.length; i += 1) {
    if (lv[i] !== rv[i]) {
      return false;
    }
  }
  return true;
}

export function eqInt(lval: ArrayBuffer, rval: u64): boolean {
  return eq(lval, numberToBuffer(rval));
}

export function cmp(lval: ArrayBuffer, rval: ArrayBuffer): i32 {
  const lv = Uint32Array.wrap(lval);
  const rv = Uint32Array.wrap(rval as ArrayBuffer);
  for (let i = DWORDS - 1; i >= 0; i -= 1) {
    if (lv[i] < rv[i]) {
      return -1;
    }
    if (lv[i] > rv[i]) {
      return 1;
    }
  }
  return 0;
}

export function cmpInt(lval: ArrayBuffer, rval: u64): i32 {
  return cmp(lval, numberToBuffer(rval));
}

export function shl(lval: ArrayBuffer, shift: u64): void {
  const copy = Uint32Array.wrap(lval.slice(0));
  const lv = Uint32Array.wrap(lval);
  lv.fill(0);
  const mem = new Uint32Array(2);
  mem[0] = u32(shift % DWORD_LENGTH); // shift
  mem[1] = u32(shift / DWORD_LENGTH); // offset
  for (let i = 0; i < DWORDS; i += 1) {
    if (i + mem[1] + 1 < DWORDS && mem[0] !== -0) {
      lv[i + mem[1] + 1] |= copy[i] >>> (DWORD_LENGTH - mem[0]);
    }
    if (i + mem[1] < DWORDS) {
      lv[i + mem[1]] |= copy[i] << mem[0];
    }
  }
}

export function shr(lval: ArrayBuffer, shift: u64): void {
  const copy = Uint32Array.wrap(lval.slice(0));
  const lv = Uint32Array.wrap(lval);
  lv.fill(0);
  const mem = new Uint32Array(2);
  mem[0] = u32(shift % DWORD_LENGTH); // shift
  mem[1] = u32(shift / DWORD_LENGTH); // offset
  for (let i = 0; i < DWORDS; i += 1) {
    if (i - mem[1] - 1 >= 0 && mem[0] !== 0) {
      lv[i - mem[1] - 1] |= copy[i] << (DWORD_LENGTH - mem[0]);
    }
    if (i - mem[1] >= 0) {
      lv[i - mem[1]] |= copy[i] >>> mem[0];
    }
  }
}

export function mul(lval: ArrayBuffer, rval: ArrayBuffer): void {
  const lv = Uint16Array.wrap(lval);
  const rv = Uint16Array.wrap(rval as ArrayBuffer);
  const ret = Uint16Array.wrap(new ArrayBuffer(BYTES));
  const mem = new Uint32Array(3);
  for (let j = 0; j < WORDS; j += 1) {
    mem[0] = 0;
    for (let i = 0; i + j < WORDS; i += 1) {
      mem[2] = lv[j] * rv[i];
      mem[1] = mem[0] + ret[i + j] + mem[2];
      ret[i + j] = mem[1] & WORD_MASK;
      mem[0] = mem[1] >>> WORD_LENGTH;
    }
  }
  lv.set(ret);
}

export function mulInt(lval: ArrayBuffer, rval: u64): void {
  mul(lval, numberToBuffer(rval));
}

export function bits(lval: ArrayBuffer): i32 {
  const lv = Uint32Array.wrap(lval);
  for (let pos = DWORDS - 1; pos >= 0; pos -= 1) {
    if (lv[pos]) {
      for (let nbits = DWORD_LENGTH - 1; nbits > 0; nbits -= 1) {
        if (lv[pos] & (1 << nbits)) {
          return DWORD_LENGTH * pos + nbits + 1;
        }
      }
      return DWORD_LENGTH * pos + 1;
    }
  }
  return 0;
}

export function divmod(lval: ArrayBuffer, rval: ArrayBuffer | null): number {
   if (!rval) {
     return 1;
   }
   const num = Uint32Array.wrap(lval.slice(0));
   const lv = Uint32Array.wrap(lval);
   const rv = Uint32Array.wrap(rval);
   lv.fill(0);
   const lvBits = bits(num.buffer);
   const rvBits = bits(rv.buffer);
   if (rvBits === 0) {
     return 1;
   }
   if (rvBits > lvBits) {
     lv.set(num);
     rv.fill(0);
     return 0;
   }
   let shift = lvBits - rvBits;
   shl(rv.buffer, shift);
   while (shift >= 0) {
     if (cmp(num.buffer, rv.buffer) >= 0) {
       sub(num.buffer, rv.buffer);
       lv[~~(shift / DWORD_LENGTH)] |= 1 << (shift - DWORD_LENGTH);
     }
     shr(rv.buffer, 1);
     shift -= 1;
   }
   rv.set(lv);
   lv.set(num);
   return 0;
 }

export function pop(lval: ArrayBuffer): u64 {
  function pop32(x: u64): u64 {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    x = (x + (x >>> 4)) & 0x0f0f0f0f;
    x = x + (x >>> 8);
    x = x + (x >>> 16);
    return x & 0x0000003f;
  }
  const lv = Uint32Array.wrap(lval);
  let sum = 0;
  for (let i = 0; i < DWORDS; i += 1) {
    sum += pop32(lv[i]);
  }
  return sum;
}
