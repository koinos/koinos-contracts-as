import { Writer, Reader } from "as-proto";
import { chain } from "@koinos/sdk-as";

export namespace getcontractmetadata {
  export class get_contract_metadata_arguments {
    static encode(
      message: get_contract_metadata_arguments,
      writer: Writer
    ): void {
      if (message.contract_id.length != 0) {
        writer.uint32(10);
        writer.bytes(message.contract_id);
      }
    }

    static decode(
      reader: Reader,
      length: i32
    ): get_contract_metadata_arguments {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_contract_metadata_arguments();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.contract_id = reader.bytes();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    contract_id: Uint8Array;

    constructor(contract_id: Uint8Array = new Uint8Array(0)) {
      this.contract_id = contract_id;
    }
  }

  export class get_contract_metadata_result {
    static encode(message: get_contract_metadata_result, writer: Writer): void {
      const unique_name_contract_metadata = message.contract_metadata;
      if (unique_name_contract_metadata !== null) {
        writer.uint32(10);
        writer.fork();
        chain.contract_metadata_object.encode(
          unique_name_contract_metadata,
          writer
        );
        writer.ldelim();
      }
    }

    static decode(reader: Reader, length: i32): get_contract_metadata_result {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_contract_metadata_result();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.contract_metadata = chain.contract_metadata_object.decode(
              reader,
              reader.uint32()
            );
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    contract_metadata: chain.contract_metadata_object | null;

    constructor(
      contract_metadata: chain.contract_metadata_object | null = null
    ) {
      this.contract_metadata = contract_metadata;
    }
  }
}
