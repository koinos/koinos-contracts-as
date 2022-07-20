import * as m from './arithmetic';

export class UInt256 {
  public buffer : ArrayBuffer | null;

  //public compareTo = this.cmp;
  //public subtract = this.sub;
  //public divideAndRemainder = this.divmod;
  //public divide = this.div;
  //public multiply = this.mul;
  //public remainder = this.mod;
  //public shiftRight = this.shr;
  //public shiftLeft = this.shl;

  private isMutable: boolean = false;

  //constructor(numberOrBufferCopy: number | UInt256 | ArrayBuffer | null);
  //constructor(str: string | null, radix: number);
/*
  constructor(
    param: u32 | UInt256 | ArrayBuffer | null,
    radix: u32 = 10
  ) {
    if (!param) {
      return this;
    }
    if (param instanceof ArrayBuffer) {
      if (param.byteLength === m.BYTES && !m.eq(param, 0)) {
        this.buffer = param;
      } else {
        throw new TypeError('NAN');
      }
      return this.optimize();
    }
    if (param instanceof UInt256) {
      if (param.buffer) {
        this.buffer = param.buffer.slice(0);
      }
      return this;
    }

   if (param < 0 || param > m.JSNUMBER_MAX_INTEGER) {
      throw new TypeError('NAN');
   }
   if (param !== 0) {
      this.buffer = m.numberToBuffer(param);
   }
   return this;
  }
*/

  public static fromNumber(param: u64): UInt256 {
    let num = new UInt256();

    if (param < 0 || param > m.JSNUMBER_MAX_INTEGER) {
      throw new TypeError('NAN');
    }
    if (param !== 0) {
      num.buffer = m.numberToBuffer(param);
    }
    return num;
  }

  public static fromUInt256(param: UInt256): UInt256 {
    let num = new UInt256();

    if (param.buffer) {
      num.buffer = param.buffer!.slice(0);
    }

    return num;
  }

  public static fromArrayBuffer(param: ArrayBuffer): UInt256 {
     let num = new UInt256();

     if (param.byteLength === m.BYTES && !m.eqInt(param, 0)) {
      num.buffer = param;
     } else {
       throw new TypeError('NAN');
     }

     return num.optimize();
  }

  public static deserialize(param: Uint8Array): UInt256 {
    let num = new UInt256();
    num.buffer = new ArrayBuffer(m.BYTES);
    m.endianConversion(param.buffer, num.buffer!);

    return num.optimize();
  }

  public serialize(): Uint8Array {
    let ret = new Uint8Array(m.BYTES);

    if (this.buffer == null)
      return ret;

    m.endianConversion(this.buffer!, ret.buffer);

    return ret;
  }

  public mutable(mutable: boolean = true): UInt256 {
    this.isMutable = mutable;
    return this;
  }

  public pow(
    rval: u32,
    mutate: boolean = this.isMutable
  ): UInt256 {
    if (rval < 0) {
      throw new Error('NAN');
    }
    const lval = mutate ? this : this.copy();
    if (rval === 0) {
      lval.buffer = UInt256.fromNumber(1).buffer;
      return lval;
    }
    if (lval.buffer === null) {
      return lval;
    }
    const rv = mutate ? this.copy() : this;
    // tslint:disable-next-line:no-increment-decrement
    while (--rval) {
      m.mul(lval.buffer!, <ArrayBuffer>rv.buffer!);
    }
    return lval.optimize();
  }

  public add(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();
    if (rval.buffer === null) {
      return lval;
    }
    if (lval.buffer === null) {
      lval.buffer = rval.buffer!.slice(0);
      return lval;
    }
    m.add(lval.buffer!, rval.buffer!);
    return lval.optimize();
  }

  public safeAdd(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const res = this.add(rval);
    if (this.gt(res)) {
      throw new TypeError('OF');
    }
    if (mutate) {
      this.buffer = res.buffer;
      return this;
    }
    return res;
  }

  public gcd(rval: UInt256, mutate: boolean = this.isMutable): UInt256 {
    let t = this.mod(rval);
    let num = rval.copy();
    let denom = t;
    let zero = new UInt256();
    while (denom.neq(zero)) {
      t = num.mod(denom, true);
      num = denom;
      denom = t;
    }
    if (!mutate) {
      return num;
    }
    this.buffer = num.buffer;
    return this;
  }

  public sub(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();

    if (rval.buffer === null) {
      return lval;
    }
    if (lval.buffer === null) {
      lval.buffer = rval.buffer!.slice(0);
      m.comp(lval.buffer!);
      return lval;
    }
    m.sub(lval.buffer!, rval.buffer!);
    return lval.optimize();
  }

  public safeSub(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    if (this.lt(rval)) {
      throw new TypeError('OF');
    }
    return this.sub(rval, mutate);
  }

  public divmod(rval: UInt256): UInt256[] {
    const lval = this.copy();
    rval = rval.copy();
    if (lval.buffer === null) {
      return [lval, lval.copy()];
    }
    if (m.divmod(lval.buffer!, rval.buffer!)) {
      throw new TypeError('DBZ');
    }
    return [rval.optimize(), lval.optimize()];
  }

  public div(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null) {
      return lval;
    }
    rval = rval.copy();
    if (m.divmod(lval.buffer!, rval.buffer!)) {
      throw new TypeError('DBZ');
    }
    lval.buffer = rval.buffer;
    return lval.optimize();
  }

  public mod(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null) {
      return lval;
    }
    rval = UInt256.fromUInt256(rval);
    if (m.divmod(lval.buffer!, rval.buffer!)) {
      throw new TypeError('DBZ');
    }
    return lval.optimize();
  }

  public mul(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null) {
      return lval;
    }

    if (rval.buffer === null) {
      lval.buffer = null;
      return lval;
    }
    m.mul(lval.buffer!, rval.buffer!);
    return lval.optimize();
  }

  public safeMul(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    let zero = new UInt256();
    if (this.eq(zero)) {
      return (mutate && this) || this.copy();
    }
    const res = this.mul(rval);
    if (res.div(this).neq(rval)) {
      throw new TypeError('OF');
    }
    if (mutate) {
      this.buffer = res.buffer;
      return this;
    }
    return res;
  }

  public and(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null) {
      return lval;
    }
    if (rval.buffer === null) {
      lval.buffer = null;
      return lval;
    }
    m.and(lval.buffer!, rval.buffer!);
    return lval;
  }
  public andNot(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null) {
      return lval;
    }
    if (rval.buffer === null) {
      return lval;
    }
    m.andNot(lval.buffer!, rval.buffer!);
    return lval.optimize();
  }

  public or(rval: UInt256 , mutate: boolean = this.isMutable): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null) {
      lval.buffer = UInt256.fromUInt256(rval).buffer;
      return lval;
    }
    if (rval.buffer === null) {
      return lval;
    }
    m.or(lval.buffer!, rval.buffer!);
    return lval;
  }

  public xor(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null) {
      lval.buffer = UInt256.fromUInt256(rval).buffer;
      return lval;
    }
    if (rval.buffer === null) {
      return lval;
    }
    m.xor(lval.buffer!, rval.buffer!);
    return lval.optimize();
  }

  public not(mutate: boolean = this.isMutable): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null)
      lval.buffer = new ArrayBuffer(m.BYTES);
    m.not(lval.buffer!);
    return lval.optimize();
  }

  public shl(shift: u32, mutate: boolean = this.isMutable): UInt256 {
    const lval = mutate ? this : this.copy();
    if (shift < 0 || shift > m.JSNUMBER_MAX_INTEGER) {
      throw new TypeError('NAN');
    }
    if (lval.buffer === null) {
      return lval;
    }
    m.shl(lval.buffer!, shift);
    return lval.optimize();
  }

  public shr(shift: u32, mutate: boolean = this.isMutable): UInt256 {
    const lval = mutate ? this : this.copy();
    if (shift < 0 || shift > m.JSNUMBER_MAX_INTEGER) {
      throw new TypeError('NAN');
    }
    if (lval.buffer === null) {
      return lval;
    }
    m.shr(lval.buffer!, shift);
    return lval.optimize();
  }

  public eq(rval: UInt256): boolean {
    if (this.buffer === null) {
      return !(rval as UInt256).buffer || m.eqInt((rval as UInt256).buffer!, 0);
    }
    return m.eq(this.buffer!, rval.buffer!);
  }

  public neq(rval: UInt256): boolean {
    return !this.eq(rval);
  }

  public cmp(rval: UInt256): i32 {
    if (this.buffer === null) {
      if (rval.buffer === null) {
        return 0;
      }
      return m.cmpInt(rval.buffer!, 0) * -1;
    }
    return m.cmp(this.buffer!, rval.buffer!);
  }

  public lte(rval: UInt256): boolean {
    return this.cmp(rval) <= 0;
  }

  public lt(rval: UInt256): boolean {
    return this.cmp(rval) < 0;
  }

  public gte(rval: UInt256): boolean {
    return this.cmp(rval) >= 0;
  }

  public gt(rval: UInt256): boolean {
    return this.cmp(rval) > 0;
  }

  public copy(): UInt256 {
    if (this.buffer === null) {
      return new UInt256();
    }
    return UInt256.fromArrayBuffer(this.buffer!.slice(0));
  }

  public valueOf(): u64 {
    if (this.buffer === null) {
      return 0;
    }
    return m.toNumber(this.buffer!);
  }

  public toString(radix: u32 = 10): string {
    if (this.buffer === null) {
      return '0';
    }
    if (radix === 16) {
      return m.toHex(this.buffer!);
    }
    if (radix > m.RADIX_MAX || radix < m.RADIX_MIN) {
      radix = 10;
    }
    if (m.cmpInt(this.buffer!, m.JSNUMBER_MAX_INTEGER) <= 0) {
      return this.valueOf().toString(radix);
    }
    let radix256 = UInt256.fromNumber(radix);
    let out: string = '';
    let divmod: UInt256[] = [];
    divmod[0] = this;
    divmod[1] = new UInt256();
    do {
      divmod = divmod[0].divmod(radix256);
      out = m.ALPHABET.charAt(i32(divmod[1].valueOf()) & m.BYTE_MASK) + out;
    } while (divmod[0].buffer);
    return out;
  }

  public toJSON(): string {
    return this.toString();
  }

  public toByteArray(): Uint8Array {
    if (this.buffer === null) {
      return Uint8Array.wrap(new ArrayBuffer(m.BYTES));
    }
    return Uint8Array.wrap(this.buffer!.slice(0));
  }

  public testBit(n: u32): boolean {
    if (this.buffer === null) {
      return false;
    }
    const buffer = this.buffer!.slice(0);
    m.shr(buffer, n);
    m.andInt(buffer, 1);
    return m.eqInt(buffer, 1);
  }

  public setBit(n: u32, mutate: boolean = this.isMutable): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null)
      lval.buffer = new ArrayBuffer(m.BYTES);
    const nbuffer = new ArrayBuffer(m.BYTES);
    m.addInt(nbuffer, 1);
    m.shl(nbuffer, n);
    m.or(lval.buffer!, nbuffer);
    return lval;
  }

  public flipBit(n: u32, mutate: boolean = this.isMutable): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null)
      lval.buffer = new ArrayBuffer(m.BYTES);
    const nbuffer = new ArrayBuffer(m.BYTES);
    m.addInt(nbuffer, 1);
    m.shl(nbuffer, n);
    m.xor(lval.buffer!, nbuffer);
    return lval.optimize();
  }

  public clearBit(n: u32, mutate: boolean = this.isMutable): UInt256 {
    const lval = mutate ? this : this.copy();
    if (lval.buffer === null) {
      return lval;
    }
    const nbuffer = new ArrayBuffer(m.BYTES);
    m.addInt(nbuffer, 1);
    m.shl(nbuffer, n);
    m.not(nbuffer);
    m.and(lval.buffer!, nbuffer);
    return lval.optimize();
  }

  public bitCount(): u32 {
    if (this.buffer === null) {
      return 0;
    }
    return m.pop(this.buffer!);
  }

  public negate(mutate: boolean = this.isMutable): UInt256 {
    const lval = mutate ? this : this.copy();
    if(lval.buffer === null)
      lval.buffer = new ArrayBuffer(m.BYTES);

    m.comp(lval.buffer!);
    return lval.optimize();
  }

  public min(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();
    rval = UInt256.fromUInt256(rval);
    if (rval.lt(lval)) {
      lval.buffer = rval.buffer;
    }
    return lval;
  }

  public max(
    rval: UInt256,
    mutate: boolean = this.isMutable
  ): UInt256 {
    const lval = mutate ? this : this.copy();
    rval = UInt256.fromUInt256(rval);
    if (rval.gt(lval)) {
      lval.buffer = rval.buffer;
    }
    return lval;
  }

  private optimize(): UInt256 {
    if (this.buffer === null) {
      return this;
    }
    if (m.eqInt(this.buffer!, 0)) {
      this.buffer = null;
    }
    return this;
  }
}
