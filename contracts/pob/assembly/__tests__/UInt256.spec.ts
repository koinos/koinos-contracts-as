import { UInt256 } from '../UInt256';

describe('constructor()', () => {
   it('number', () => {
      const max : u64 = 0x1fffffffffffff;
      expect(UInt256.fromNumber(max).valueOf()).toBe(max);
      expect(
         () => {
            const max : u64 = 0x1fffffffffffff;
            UInt256.fromNumber(max + 2)
      }).toThrow();
      for (let i : u64 = 2; i < 9007199254740992; i *= 2) {
         expect(UInt256.fromNumber(i).valueOf()).toBe(i);
      }
   });
});

describe('Addition', () => {
   it('0 + 0 = 0', () => {
      const zero = new UInt256();

      expect(zero.add(zero).eq(zero)).toBe(true);
      expect(zero.add(zero).buffer).toBe(null);
   });

   it('max + 1 = 0', () => {
      const maxPlusOne = new UInt256().not().add(UInt256.fromNumber(1));
      expect(maxPlusOne.eq(new UInt256())).toBe(true);
      expect(maxPlusOne.buffer).toBe(null);
   });

   it('1 + 1 = 2', () => {
      const one = UInt256.fromNumber(1);
      const two = UInt256.fromNumber(2);

      expect(one.add(one).eq(two)).toBe(true);
   });

   it('should test overflow', () => {
      const max = new UInt256().not();
      const one = UInt256.fromNumber(1);

      expect(max.add(one).eq(new UInt256())).toBe(true);
   });

   it('should test mutation', () => {
      const a = UInt256.fromNumber(1);
      const two = UInt256.fromNumber(2);

      a.add(a, true);

      expect(a.eq(two)).toBe(true);
   });
});

describe('Subtraction', () => {
   it('small - small = 0', () => {
      const one = UInt256.fromNumber(1);
      const oneSubOne = one.sub(one);
      expect(oneSubOne.eq(new UInt256())).toBe(true);
      expect(oneSubOne.buffer).toBe(null);
   });

   it('big - small = xor(big, small)', () => {
      const max = new UInt256().not();
      const one = UInt256.fromNumber(1);
      const maxXORsmall = max.xor(one);
      expect(max.sub(one).eq(maxXORsmall)).toBe(true);
   });

   it('big - big = 0', () => {
      const max = new UInt256().not();

      expect(max.sub(max).eq(new UInt256())).toBe(true);
      expect(max.sub(max).buffer).toBe(null);
   });

   it('small - big = 2', () => {
      const max = new UInt256().not();
      const one = UInt256.fromNumber(1);

      expect(one.sub(max).eq(UInt256.fromNumber(2))).toBe(true);
   });

   it('should test mutation', () => {
      const one = UInt256.fromNumber(1);
      let num = UInt256.fromNumber(2);

      num.sub(one, true);
      expect(num.eq(one)).toBe(true);

      num.sub(one, true);
      expect(num.eq(new UInt256())).toBe(true);
   });
});

describe('Multiplication', () => {
   it('should test nullability', () => {
      const zero = new UInt256();
      const one = UInt256.fromNumber(1);

      const oneMulZero = one.mul(zero);
      const zeroMulOne = zero.mul(one);
      const zeroMulZero = zero.mul(zero);

      expect(oneMulZero.eq(zero)).toBe(true);
      expect(zeroMulOne.eq(zero)).toBe(true);
      expect(zeroMulZero.eq(zero)).toBe(true);

      expect(oneMulZero.buffer).toBe(null);
      expect(zeroMulOne.buffer).toBe(null);
      expect(zeroMulZero.buffer).toBe(null);
   });

   it('should test identity', () => {
      const one = UInt256.fromNumber(1);
      const two = UInt256.fromNumber(2);

      expect(two.mul(one).eq(two)).toBe(true);
      expect(one.mul(two).eq(two)).toBe(true);
   });

   it('should test mutation', () => {
      const two = UInt256.fromNumber(2);
      let val = UInt256.fromNumber(1);

      val.mul(two, true);
      expect(val.eq(UInt256.fromNumber(2))).toBe(true);

      val.mul(two, true);
      expect(val.eq(UInt256.fromNumber(4))).toBe(true);

      val.mul(two, true);
      expect(val.eq(UInt256.fromNumber(8))).toBe(true);
   });
});

describe('Pow', () => {
   it('x ** 0 = 1', () => {
      expect(UInt256.fromNumber(10).pow(0).eq(UInt256.fromNumber(1))).toBe(true);
      expect(UInt256.fromNumber(10).pow(1).eq(UInt256.fromNumber(10 ** 1))).toBe(true);
      expect(UInt256.fromNumber(10).pow(2).eq(UInt256.fromNumber(10 ** 2))).toBe(true);
      expect(UInt256.fromNumber(10).pow(3).eq(UInt256.fromNumber(10 ** 3))).toBe(true);
   });
});

describe('Division | Modulo ', () => {
   const zero = new UInt256();
   const one = UInt256.fromNumber(1);
   const two = UInt256.fromNumber(2);
   const three = UInt256.fromNumber(3);

   it('0 / 2 = 0 and mod = 0', () => {
      const zero = new UInt256();
      const two = UInt256.fromNumber(2);
      const zeroDivTwo = zero.div(two);
      const zeroModTwo = zero.mod(two);

      expect(zeroDivTwo.eq(zero)).toBe(true);
      expect(zeroModTwo.eq(zero)).toBe(true);

      expect(zeroDivTwo.buffer).toBe(null);
      expect(zeroModTwo.buffer).toBe(null);

      const res = zero.divmod(two);

      expect(res[0].eq(zero)).toBe(true);
      expect(res[1].eq(zero)).toBe(true);

      expect(res[0].buffer).toBe(null);
      expect(res[1].buffer).toBe(null);
   });

   it('a / 2 = a >> 2 and mod = 1', () => {
      const one = UInt256.fromNumber(1);
      const two = UInt256.fromNumber(2);

      expect(one.div(two).eq(one.shr(1))).toBe(true);
      expect(one.mod(two).eq(one)).toBe(true);

      const res = one.divmod(two);
      expect(res[0].eq(one.shr(1))).toBe(true);
      expect(res[1].eq(one)).toBe(true);
   });

   it('b / a = 2 and mod = 1', () => {
      const one = UInt256.fromNumber(1);
      const two = UInt256.fromNumber(2);
      const five = UInt256.fromNumber(5);

      expect(five.div(two).eq(two)).toBe(true);
      expect(five.mod(two).eq(one)).toBe(true);

      const res = five.divmod(two);
      //expect(res[0].eq(two)).toBe(true);
      //expect(res[1].eq(one)).toBe(true);
   });

   it('should test DBZ', () => {
      expect(
         () => {
            const one = UInt256.fromNumber(1);
            const zero = new UInt256();
            one.div(zero)
         }
      ).toThrow();

      expect(
         () => {
            const one = UInt256.fromNumber(1);
            const zero = new UInt256();
            one.mod(zero)
         }
      ).toThrow();

      expect(
         () => {
            const one = UInt256.fromNumber(1);
            const zero = new UInt256();
            one.divmod(zero)
         }
      ).toThrow();
   });

   it('should test identity', () => {
      const zero = new UInt256();
      const one = UInt256.fromNumber(1);
      const two = UInt256.fromNumber(2);

      expect(two.div(one).eq(two)).toBe(true);
      //expect(two.mod(one).eq(zero)).toBe(true);

      //const res = two.divmod(one);
      //expect(res[0].eq(two)).toBe(true);
      //expect(res[1].eq(zero)).toBe(true);
   });
});
