import { Writer, Reader } from "as-proto";

export namespace vhp {
  export class effective_balance_of_arguments {
    static encode(
      message: effective_balance_of_arguments,
      writer: Writer
    ): void {
      const unique_name_owner = message.owner;
      if (unique_name_owner !== null) {
        writer.uint32(10);
        writer.bytes(unique_name_owner);
      }
    }

    static decode(reader: Reader, length: i32): effective_balance_of_arguments {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new effective_balance_of_arguments();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.owner = reader.bytes();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    owner: Uint8Array | null;

    constructor(owner: Uint8Array | null = null) {
      this.owner = owner;
    }
  }

  @unmanaged
  export class effective_balance_of_result {
    static encode(message: effective_balance_of_result, writer: Writer): void {
      if (message.value != 0) {
        writer.uint32(8);
        writer.uint64(message.value);
      }
    }

    static decode(reader: Reader, length: i32): effective_balance_of_result {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new effective_balance_of_result();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value = reader.uint64();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: u64;

    constructor(value: u64 = 0) {
      this.value = value;
    }
  }

  @unmanaged
  export class balance_object {
    static encode(message: balance_object, writer: Writer): void {
      if (message.value != 0) {
        writer.uint32(8);
        writer.uint64(message.value);
      }
    }

    static decode(reader: Reader, length: i32): balance_object {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new balance_object();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value = reader.uint64();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: u64;

    constructor(value: u64 = 0) {
      this.value = value;
    }
  }

  @unmanaged
  export class balance_entry {
    static encode(message: balance_entry, writer: Writer): void {
      if (message.block_height != 0) {
        writer.uint32(8);
        writer.uint64(message.block_height);
      }

      if (message.balance != 0) {
        writer.uint32(16);
        writer.uint64(message.balance);
      }
    }

    static decode(reader: Reader, length: i32): balance_entry {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new balance_entry();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.block_height = reader.uint64();
            break;

          case 2:
            message.balance = reader.uint64();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    block_height: u64;
    balance: u64;

    constructor(block_height: u64 = 0, balance: u64 = 0) {
      this.block_height = block_height;
      this.balance = balance;
    }
  }

  export class effective_balance_object {
    static encode(message: effective_balance_object, writer: Writer): void {
      if (message.current_balance != 0) {
        writer.uint32(8);
        writer.uint64(message.current_balance);
      }

      const unique_name_past_balances = message.past_balances;
      for (let i = 0; i < unique_name_past_balances.length; ++i) {
        writer.uint32(18);
        writer.fork();
        balance_entry.encode(unique_name_past_balances[i], writer);
        writer.ldelim();
      }
    }

    static decode(reader: Reader, length: i32): effective_balance_object {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new effective_balance_object();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.current_balance = reader.uint64();
            break;

          case 2:
            message.past_balances.push(
              balance_entry.decode(reader, reader.uint32())
            );
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    current_balance: u64;
    past_balances: Array<balance_entry>;

    constructor(
      current_balance: u64 = 0,
      past_balances: Array<balance_entry> = []
    ) {
      this.current_balance = current_balance;
      this.past_balances = past_balances;
    }
  }
}
