import { authority, chain, protocol, system_call_ids, System, Protobuf, 
    Base58, value, any, system_calls, Token, SafeMath } from "koinos-sdk-as";

namespace State {
  export namespace Space {
    export const REGISTRATION = new chain.object_space(true, System.getContractId(), 0);
    export const METADATA = new 
}
  
System.MAX_BUFFER_SIZE = 1024 * 100;

namespace Constants {
  export const TOKEN_CONTRACT_ID = Base58.decode('1BRmrUgtSQVUggoeE9weG4f7nidyydnYfQ');
  export const VHP_CONTRACT_ID = Base58.decode('??');
  export const METADATA_KEY: Uint8Array = new Uint8Array(0);
}

export class POB {
  register_public_key(args: pob.register_public_key_arguments): pob.register_public_key_result {
    const db = System.getObject<string, pob.address_record>(State.Space.REGISTRATION, args.public_key!, pob.address_record.decode);
    
    if (db) {
      System.log("Public key: '" + args.public_key + "' already registered. Overwriting.");
    }

    // Get the payer address
    const tx = System.getTransactionField('header.payer') as value.value_type;
    const sender = tx.bytes_value as Uint8Array;

    // Create and store the record
    const record = new pob.address_record(sender);
    System.putObject(State.Space.REGISTRATION, args.public_key!, record, pob.address_record.encode);

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
    const sig_data = args.signature
    return new system_calls.process_block_signature_result();
  }

  get_metadata(args: pob.get_metadata_arguments): pob.get_metadata_result {

  }

  fetch_metadata(): pob.metadata {
    const data = System.getObject<string, pob.metadata>(State.Space.METADATA, args.public_key!, pob.address_record.decode);
    
    if (db) {
      System.log("Public key: '" + args.public_key + "' already registered. Overwriting.");
    }
  }
}
