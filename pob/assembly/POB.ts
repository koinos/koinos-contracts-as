import { BigInt, Bytes } from '@graphprotocol/graph-ts'
import { authority, chain, protocol, system_call_ids, System, Protobuf, 
    Base58, value, any, system_calls, Token, SafeMath } from "koinos-sdk-as";

namespace State {
  export namespace Space {
    export const REGISTRATION = new chain.object_space(true, System.getContractId(), 0);
    export const METADATA = new chain.object_space(true, System.getContractId(), 1);
}
  
System.MAX_BUFFER_SIZE = 1024 * 100;

namespace Constants {
  export const TOKEN_CONTRACT_ID = Base58.decode('1BRmrUgtSQVUggoeE9weG4f7nidyydnYfQ');
  export const VHP_CONTRACT_ID = Base58.decode('??');
  export const METADATA_KEY: Uint8Array = new Uint8Array(0);
  export const INITIAL_DIFFICULTY_BITS:u32 = 32;
  export const TARGET_BLOCK_INTERVAL_S:u32 = 10;
  export const BLOCK_QUANTA :u32 = 10;

  export const VHP_DEDUCTION:u64 =  95000000
  export const BLOCK_REWARD:u64  = 100000000
}

export class POB {
  register_public_key(args: pob.register_public_key_arguments): pob.register_public_key_result {
    const db = System.getObject<Uint8Array, pob.address_record>(State.Space.REGISTRATION, args.public_key!, pob.address_record.decode);
    
    if (db) {
      System.log("Public key: '" + args.public_key + "' already registered. Overwriting.");
    }

    // Get the payer address
    const tx = System.getTransactionField('header.payer') as value.value_type;
    const sender = tx.bytes_value as Uint8Array;

    // Create and store the record
    const record = new pob.address_record(sender);
    System.putObject(State.Space.REGISTRATION, args.public_key!, record, pob.public_key_record.encode);

    // Emit an event
    const event = new pob.register_public_key_event(sender, args.public_key);
    System.event('pob.register_public_key', Protobuf.encode(event, pob.address_record.encode), [sender]);

    return new pob.register_public_key_result();
  }

  burn(args: pob.burn_arguments): pob.burn_result {
    const token = new Token(Constants.TOKEN_CONTRACT_ID);
    const vhp = new Token(Constants.VHP_CONTRACT_ID);
    
    // Ensure burn address has enough token
    const balance = token.balanceOf(args.burn_address);
    System.require(balance >= args.amount, "insufficient balance");

    // Burn the token
    System.require(token.burn(args.burn_address, args.amount), "could not burn KOIN");

    // Mint the new VHP
    System.require(vhp.mint(args.vhp_address, args.amount), "could not mint VHP");
  }

  process_block_signature(args: system_calls.process_block_signature_arguments): system_calls.process_block_signature_result {
    const sig_data_bytes = args.signature!;
    const signature = Protobuf.decode<pob.signature_data>(sig_data_bytes, pob.signature_data.decode);
    const signer = args.header!.signer!;

    const token = new Token(Constants.TOKEN_CONTRACT_ID);
    const vhp = new Token(Constants.VHP_CONTRACT_ID);

    const metadata = this.fetch_metadata();
    
    // Check block quanta
    System.require

    // Check vrf proof against seed and block time
    //System.verifyVRFProof(publicKey: Uint8Array, proof: Uint8Array, hash: Uint8Array, message: Uint8Array, type: chain.dsa = chain.dsa.ecdsa_secp256k1): bool {
      const registration = System.getObject<Uint8Array, pob.public_key_record>(State.Space.REGISTRATION, signer, pob.public_key_record.decode);
      System.require(registration, "signer address has no public key record");
    System.verifyVRFProof()
    // Ensure vrf hash divided by producer's vhp is below difficulty
    const difficulty = BigInt.fromUnsignedBytes(Bytes.fromUint8Array(metadata.metadata!.difficulty!));
    const hash = BigInt.fromUnsignedBytes(Bytes.fromUint8Array(signature.vrf_hash!));
    const vhp_balance = BigInt.fromString(vhp.balanceOf(signer).toString()); // TODO: This is very ugly

    System.require(hash/vhp_balance < difficulty, "provided hash is not sufficient");

    // On successful block deduct vhp and mint new koin
    System.require(vhp.burn(signer, Constants.VHP_DEDUCTION), "could not burn vhp");
    System.require(token.mint(signer, Constants.BLOCK_REWARD), "could not mint token");

    this.update_difficulty();

    return new system_calls.process_block_signature_result();
  }

  get_metadata(args: pob.get_metadata_arguments): pob.get_metadata_result {
    const metadata = this.fetch_metadata();
    return new pob.get_metadata_result(metadata);
  }

  update_difficulty() {

  }

  fetch_metadata(): pob.metadata {
    const data = System.getObject<Uint8Array, pob.metadata>(State.Space.METADATA, Constants.METADATA_KEY, pob.metadata.decode);
    
    if (data) {
      return data;
    }

    // Initialize new metadata
    var new_data = new pob.metadata();
    
    var difficulty = new u256();
    var seed = new u256();
    var a = 

    new_data.difficulty = difficulty.toBytes();
    new_data.seed = seed.toBytes();
    new_data.last_block_time = System.getHeadInfo().head_block_time;
    new_data.target_block_interval = Constants.TARGET_BLOCK_INTERVAL_S;

    // Store it
    System.putObject(State.Space.METADATA, Constants.METADATA_KEY, new_data, pob.metadata.encode);

    return new_data;
  }
}
