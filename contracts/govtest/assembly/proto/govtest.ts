import { Writer, Reader } from "as-proto";

export namespace govtest {
  @unmanaged
  export class post_block_callback_event {
    static encode(message: post_block_callback_event, writer: Writer): void {}

    static decode(reader: Reader, length: i32): post_block_callback_event {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new post_block_callback_event();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    constructor() {}
  }

  @unmanaged
  export class example_arguments {
    static encode(message: example_arguments, writer: Writer): void {}

    static decode(reader: Reader, length: i32): example_arguments {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new example_arguments();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    constructor() {}
  }

  @unmanaged
  export class example_result {
    static encode(message: example_result, writer: Writer): void {}

    static decode(reader: Reader, length: i32): example_result {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new example_result();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    constructor() {}
  }
}
