import { Writer, Reader } from "as-proto";
import { protocol } from "koinos-as-sdk";

export namespace governance {
  export class proposal_record {
    static encode(message: proposal_record, writer: Writer): void {
      const proposal = message.proposal;
      if (proposal !== null) {
        writer.uint32(10);
        writer.fork();
        protocol.transaction.encode(proposal, writer);
        writer.ldelim();
      }

      writer.uint32(16);
      writer.uint64(message.vote_start_height);

      writer.uint32(24);
      writer.uint64(message.vote_tally);

      writer.uint32(32);
      writer.uint64(message.vote_threshold);

      writer.uint32(40);
      writer.bool(message.shall_authorize);

      writer.uint32(48);
      writer.bool(message.updates_governance);

      writer.uint32(56);
      writer.int32(message.status);
    }

    static decode(reader: Reader, length: i32): proposal_record {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new proposal_record();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.proposal = protocol.transaction.decode(
              reader,
              reader.uint32()
            );
            break;

          case 2:
            message.vote_start_height = reader.uint64();
            break;

          case 3:
            message.vote_tally = reader.uint64();
            break;

          case 4:
            message.vote_threshold = reader.uint64();
            break;

          case 5:
            message.shall_authorize = reader.bool();
            break;

          case 6:
            message.updates_governance = reader.bool();
            break;

          case 7:
            message.status = reader.int32();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    proposal: protocol.transaction | null;
    vote_start_height: u64;
    vote_tally: u64;
    vote_threshold: u64;
    shall_authorize: bool;
    updates_governance: bool;
    status: governance.proposal_status;

    constructor(
      proposal: protocol.transaction | null = null,
      vote_start_height: u64 = 0,
      vote_tally: u64 = 0,
      vote_threshold: u64 = 0,
      shall_authorize: bool = false,
      updates_governance: bool = false,
      status: governance.proposal_status = 0
    ) {
      this.proposal = proposal;
      this.vote_start_height = vote_start_height;
      this.vote_tally = vote_tally;
      this.vote_threshold = vote_threshold;
      this.shall_authorize = shall_authorize;
      this.updates_governance = updates_governance;
      this.status = status;
    }
  }

  export class submit_proposal_arguments {
    static encode(message: submit_proposal_arguments, writer: Writer): void {
      const proposal = message.proposal;
      if (proposal !== null) {
        writer.uint32(10);
        writer.fork();
        protocol.transaction.encode(proposal, writer);
        writer.ldelim();
      }

      writer.uint32(16);
      writer.uint64(message.fee);
    }

    static decode(reader: Reader, length: i32): submit_proposal_arguments {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new submit_proposal_arguments();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.proposal = protocol.transaction.decode(
              reader,
              reader.uint32()
            );
            break;

          case 2:
            message.fee = reader.uint64();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    proposal: protocol.transaction | null;
    fee: u64;

    constructor(
      proposal: protocol.transaction | null = null,
      fee: u64 = 0
    ) {
      this.proposal = proposal;
      this.fee = fee;
    }
  }

  @unmanaged
  export class submit_proposal_result {
    static encode(message: submit_proposal_result, writer: Writer): void {
      writer.uint32(8);
      writer.bool(message.value);
    }

    static decode(reader: Reader, length: i32): submit_proposal_result {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new submit_proposal_result();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value = reader.bool();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: bool;

    constructor(value: bool = false) {
      this.value = value;
    }
  }

  export class get_proposal_by_id_arguments {
    static encode(message: get_proposal_by_id_arguments, writer: Writer): void {
      const proposal_id = message.proposal_id;
      if (proposal_id !== null) {
        writer.uint32(10);
        writer.bytes(proposal_id);
      }
    }

    static decode(reader: Reader, length: i32): get_proposal_by_id_arguments {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_proposal_by_id_arguments();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.proposal_id = reader.bytes();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    proposal_id: Uint8Array | null;

    constructor(proposal_id: Uint8Array | null = null) {
      this.proposal_id = proposal_id;
    }
  }

  export class get_proposal_by_id_result {
    static encode(message: get_proposal_by_id_result, writer: Writer): void {
      const value = message.value;
      if (value !== null) {
        writer.uint32(10);
        writer.fork();
        governance.proposal_record.encode(value, writer);
        writer.ldelim();
      }
    }

    static decode(reader: Reader, length: i32): get_proposal_by_id_result {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_proposal_by_id_result();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value = governance.proposal_record.decode(
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

    value: governance.proposal_record | null;

    constructor(value: governance.proposal_record | null = null) {
      this.value = value;
    }
  }

  export class get_proposals_by_status_arguments {
    static encode(
      message: get_proposals_by_status_arguments,
      writer: Writer
    ): void {
      const start_proposal = message.start_proposal;
      if (start_proposal !== null) {
        writer.uint32(10);
        writer.bytes(start_proposal);
      }

      writer.uint32(16);
      writer.uint64(message.limit);

      writer.uint32(24);
      writer.int32(message.status);
    }

    static decode(
      reader: Reader,
      length: i32
    ): get_proposals_by_status_arguments {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_proposals_by_status_arguments();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.start_proposal = reader.bytes();
            break;

          case 2:
            message.limit = reader.uint64();
            break;

          case 3:
            message.status = reader.int32();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    start_proposal: Uint8Array | null;
    limit: u64;
    status: governance.proposal_status;

    constructor(
      start_proposal: Uint8Array | null = null,
      limit: u64 = 0,
      status: governance.proposal_status = 0
    ) {
      this.start_proposal = start_proposal;
      this.limit = limit;
      this.status = status;
    }
  }

  export class get_proposals_by_status_result {
    static encode(
      message: get_proposals_by_status_result,
      writer: Writer
    ): void {
      const value = message.value;
      for (let i = 0; i < value.length; ++i) {
        writer.uint32(10);
        writer.fork();
        governance.proposal_record.encode(value[i], writer);
        writer.ldelim();
      }
    }

    static decode(reader: Reader, length: i32): get_proposals_by_status_result {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_proposals_by_status_result();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value.push(
              governance.proposal_record.decode(reader, reader.uint32())
            );
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: Array<governance.proposal_record>;

    constructor(value: Array<governance.proposal_record> = []) {
      this.value = value;
    }
  }

  export class get_proposals_arguments {
    static encode(message: get_proposals_arguments, writer: Writer): void {
      const start_proposal = message.start_proposal;
      if (start_proposal !== null) {
        writer.uint32(10);
        writer.bytes(start_proposal);
      }

      writer.uint32(16);
      writer.uint64(message.limit);
    }

    static decode(reader: Reader, length: i32): get_proposals_arguments {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_proposals_arguments();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.start_proposal = reader.bytes();
            break;

          case 2:
            message.limit = reader.uint64();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    start_proposal: Uint8Array | null;
    limit: u64;

    constructor(start_proposal: Uint8Array | null = null, limit: u64 = 0) {
      this.start_proposal = start_proposal;
      this.limit = limit;
    }
  }

  export class get_proposals_result {
    static encode(message: get_proposals_result, writer: Writer): void {
      const value = message.value;
      for (let i = 0; i < value.length; ++i) {
        writer.uint32(10);
        writer.fork();
        governance.proposal_record.encode(value[i], writer);
        writer.ldelim();
      }
    }

    static decode(reader: Reader, length: i32): get_proposals_result {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_proposals_result();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value.push(
              governance.proposal_record.decode(reader, reader.uint32())
            );
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: Array<governance.proposal_record>;

    constructor(value: Array<governance.proposal_record> = []) {
      this.value = value;
    }
  }

  export class proposal_submission_event {
    static encode(message: proposal_submission_event, writer: Writer): void {
      const proposal = message.proposal;
      if (proposal !== null) {
        writer.uint32(10);
        writer.fork();
        governance.proposal_record.encode(proposal, writer);
        writer.ldelim();
      }
    }

    static decode(reader: Reader, length: i32): proposal_submission_event {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new proposal_submission_event();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.proposal = governance.proposal_record.decode(
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

    proposal: governance.proposal_record | null;

    constructor(proposal: governance.proposal_record | null = null) {
      this.proposal = proposal;
    }
  }

  export class proposal_status_event {
    static encode(message: proposal_status_event, writer: Writer): void {
      const id = message.id;
      if (id !== null) {
        writer.uint32(10);
        writer.bytes(id);
      }

      writer.uint32(16);
      writer.int32(message.status);
    }

    static decode(reader: Reader, length: i32): proposal_status_event {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new proposal_status_event();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.id = reader.bytes();
            break;

          case 2:
            message.status = reader.int32();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    id: Uint8Array | null;
    status: governance.proposal_status;

    constructor(
      id: Uint8Array | null = null,
      status: governance.proposal_status = 0
    ) {
      this.id = id;
      this.status = status;
    }
  }

  export class proposal_vote_event {
    static encode(message: proposal_vote_event, writer: Writer): void {
      const id = message.id;
      if (id !== null) {
        writer.uint32(10);
        writer.bytes(id);
      }

      writer.uint32(16);
      writer.uint64(message.vote_tally);

      writer.uint32(24);
      writer.uint64(message.vote_threshold);
    }

    static decode(reader: Reader, length: i32): proposal_vote_event {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new proposal_vote_event();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.id = reader.bytes();
            break;

          case 2:
            message.vote_tally = reader.uint64();
            break;

          case 3:
            message.vote_threshold = reader.uint64();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    id: Uint8Array | null;
    vote_tally: u64;
    vote_threshold: u64;

    constructor(
      id: Uint8Array | null = null,
      vote_tally: u64 = 0,
      vote_threshold: u64 = 0
    ) {
      this.id = id;
      this.vote_tally = vote_tally;
      this.vote_threshold = vote_threshold;
    }
  }

  @unmanaged
  export class block_callback_arguments {
    static encode(message: block_callback_arguments, writer: Writer): void {}

    static decode(reader: Reader, length: i32): block_callback_arguments {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new block_callback_arguments();

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
  export class block_callback_result {
    static encode(message: block_callback_result, writer: Writer): void {}

    static decode(reader: Reader, length: i32): block_callback_result {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new block_callback_result();

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

  export enum proposal_status {
    pending = 0,
    active = 1,
    approved = 2,
    expired = 3,
    applied = 4,
  }
}
