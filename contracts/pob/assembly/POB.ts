import { BigInt, Bytes } from 'graph-ts'
import { chain, System, Protobuf, 
    Base58, value, system_calls, Token, Crypto, pob } from "koinos-sdk-as";

namespace State {
  export namespace Space {
    export const REGISTRATION = new chain.object_space(true, System.getContractId(), 0);
    export const METADATA = new chain.object_space(true, System.getContractId(), 1);
  }
}

System.MAX_BUFFER_SIZE = 1024 * 100;

namespace Constants {
  export const TOKEN_CONTRACT_ID = Base58.decode('1BRmrUgtSQVUggoeE9weG4f7nidyydnYfQ');
  export const VHP_CONTRACT_ID = Base58.decode('1JZqj7dDrK5LzvdJgufYBJNUFo88xBoWC8');
  export const METADATA_KEY: Uint8Array = new Uint8Array(0);
  export const INITIAL_DIFFICULTY_BITS:u8 = 32;
  export const TARGET_BLOCK_INTERVAL_S:u32 = 10;
  export const BLOCK_TIME_QUANTA :u32 = 10;

  export const VHP_DEDUCTION:u64 =  95000000
  export const BLOCK_REWARD:u64  = 100000000
}

export class POB {
  register_public_key(args: pob.register_public_key_arguments): pob.register_public_key_result {
    const db = System.getObject<Uint8Array, pob.public_key_record>(State.Space.REGISTRATION, args.public_key!, pob.public_key_record.decode);
    
    if (db) {
      System.log("Public key already registered. Overwriting.");
    }

    // Get the payer address
    const tx = System.getTransactionField('header.payer') as value.value_type;
    const sender = tx.bytes_value as Uint8Array;

    // Create and store the record
    const record = new pob.public_key_record(args.public_key!);
    System.putObject(State.Space.REGISTRATION, sender, record, pob.public_key_record.encode);

    // Emit an event
    const event = new pob.register_public_key_event(sender, args.public_key);
    System.event('pob.register_public_key', Protobuf.encode(event, pob.register_public_key_event.encode), [sender]);

    return new pob.register_public_key_result();
  }

  burn(args: pob.burn_arguments): pob.burn_result {
    const token = new Token(Constants.TOKEN_CONTRACT_ID);
    const vhp = new Token(Constants.VHP_CONTRACT_ID);
    const amount = args.token_amount;

    // Ensure burn address has enough token
    const balance = token.balanceOf(args.burn_address!);
    System.require(balance >= amount, "insufficient balance");

    // Burn the token
    System.require(token.burn(args.burn_address!, amount), "could not burn KOIN");

    // Mint the new VHP
    System.require(vhp.mint(args.vhp_address!, amount), "could not mint VHP");

    return new pob.burn_result();
  }

  process_block_signature(args: system_calls.process_block_signature_arguments): system_calls.process_block_signature_result {
    const sig_data_bytes = args.signature!;
    const signature = Protobuf.decode<pob.signature_data>(sig_data_bytes, pob.signature_data.decode);
    const signer = args.header!.signer!;
    const timestamp = args.header!.timestamp;
    const head_block_time = System.getHeadInfo().head_block_time;

    const token = new Token(Constants.TOKEN_CONTRACT_ID);
    const vhp = new Token(Constants.VHP_CONTRACT_ID);

    const metadata = this.fetch_metadata();

    // Check block quanta
    System.require(args.header!.timestamp % Constants.BLOCK_TIME_QUANTA == 0, "time stamp does not match time quanta");

    // Get signer's public key
    const registration = System.getObject<Uint8Array, pob.public_key_record>(State.Space.REGISTRATION, signer, pob.public_key_record.decode);
    System.require(registration != null, "signer address has no public key record");

    // Create vrf payload and serialize it
    const payload = new pob.vrf_payload(metadata.seed, timestamp);
    const payload_bytes = Protobuf.encode(payload, pob.vrf_payload.encode);

    System.require(System.verifyVRFProof(registration!.public_key!, signature.vrf_proof!, signature.vrf_hash!, payload_bytes), "proof failed vrf validation");

    // Ensure vrf hash divided by producer's vhp is below difficulty
    const difficulty = BigInt.fromUnsignedBytes(Bytes.fromUint8Array(metadata.difficulty!));
    const hash = BigInt.fromUnsignedBytes(Bytes.fromUint8Array(signature.vrf_hash!));
    const vhp_balance = BigInt.fromU64(vhp.balanceOf(signer));

    const mark = hash.div(vhp_balance);
    System.require(mark < difficulty, "provided hash is not sufficient");

    // On successful block deduct vhp and mint new koin
    System.require(vhp.burn(signer, Constants.VHP_DEDUCTION), "could not burn vhp");
    System.require(token.mint(signer, Constants.BLOCK_REWARD), "could not mint token");

    this.update_difficulty(difficulty, metadata, head_block_time, signature.vrf_hash!);

    return new system_calls.process_block_signature_result();
  }

  get_metadata(args: pob.get_metadata_arguments): pob.get_metadata_result {
    const metadata = this.fetch_metadata();
    return new pob.get_metadata_result(metadata);
  }

  update_difficulty(difficulty:BigInt, metadata:pob.metadata, current_block_time:u64, vrf_hash:Uint8Array): void {
    // Calulate new difficulty
    let new_difficulty = difficulty.div(BigInt.fromI32(2048)).plus(difficulty);
    let multiplier:u64 = 1 - (current_block_time - metadata.last_block_time) / 7000;
    multiplier = multiplier > -99 ? multiplier : -99;
    new_difficulty = new_difficulty.times(BigInt.fromU64(multiplier));

    // Update seed
    const new_seed = metadata.seed!;

    var new_data = new pob.metadata();
    new_data.difficulty = difficulty;
    new_data.seed = System.hash(Crypto.multicodec.sha2_256, vrf_hash);
    new_data.last_block_time = current_block_time;
    new_data.target_block_interval = Constants.TARGET_BLOCK_INTERVAL_S;

    System.putObject(State.Space.METADATA, Constants.METADATA_KEY, new_data, pob.metadata.encode);
  }

  fetch_metadata(): pob.metadata {
    const data = System.getObject<Uint8Array, pob.metadata>(State.Space.METADATA, Constants.METADATA_KEY, pob.metadata.decode);

    if (data) {
      return data;
    }

    // Initialize new metadata
    var new_data = new pob.metadata();
    
    var difficulty = BigInt.fromI32(1);
    difficulty = difficulty.leftShift(Constants.INITIAL_DIFFICULTY_BITS);
    var seed = BigInt.fromI32(0);

    new_data.difficulty = difficulty;
    new_data.seed = seed;
    new_data.last_block_time = System.getHeadInfo().head_block_time;
    new_data.target_block_interval = Constants.TARGET_BLOCK_INTERVAL_S;

    // Store it
    System.putObject(State.Space.METADATA, Constants.METADATA_KEY, new_data, pob.metadata.encode);

    return new_data;
  }
}
